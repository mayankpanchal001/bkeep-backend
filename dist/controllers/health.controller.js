"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = void 0;
const env_1 = require("../config/env");
const http_1 = require("../constants/http");
const connection_1 = __importDefault(require("../database/connection"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Check database connection health
 * @returns Promise that resolves with health check result
 */
const checkDatabaseHealth = async () => {
    const startTime = Date.now();
    try {
        // Simple query to check database connectivity
        // Don't destroy the connection - it's shared across the application
        // The connection pool will manage connections automatically
        await connection_1.default.raw("SELECT 1");
        const responseTime = Date.now() - startTime;
        return {
            status: "ok",
            responseTime,
        };
    }
    catch (error) {
        // Don't destroy the connection even on error
        // The connection pool will handle reconnection automatically
        return {
            status: "down",
            responseTime: Date.now() - startTime,
            details: error instanceof Error ? error.message : "Database connection failed",
        };
    }
};
const getHealth = (0, asyncHandler_1.default)(async (_req, res) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    // Determine overall health status
    let overallStatus = "ok";
    if (dbHealth.status === "down") {
        overallStatus = "down";
    }
    else if (dbHealth.status === "degraded") {
        overallStatus = "degraded";
    }
    const responseTime = Date.now() - startTime;
    const healthResponse = {
        success: true,
        message: overallStatus === "ok"
            ? "Service is healthy"
            : overallStatus === "degraded"
                ? "Service is degraded"
                : "Service is unhealthy",
        status: overallStatus,
        timestamp,
        services: {
            database: dbHealth,
        },
        version: "1.0.0",
        environment: env_1.env.NODE_ENV,
    };
    const statusCode = overallStatus === "ok" ? http_1.HTTP_STATUS.OK : http_1.HTTP_STATUS.SERVICE_UNAVAILABLE;
    res.status(statusCode).json({
        ...healthResponse,
        responseTime,
    });
});
exports.getHealth = getHealth;
