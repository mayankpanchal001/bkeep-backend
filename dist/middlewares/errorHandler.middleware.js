"use strict";
/**
 * Global Error Handler Middleware
 * Centralized error handling for all application errors
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
/**
 * Global error handler middleware
 * Handles all errors and returns normalized JSON responses
 */
const errorHandler = (error, req, res, _next) => {
    let { statusCode, message } = error;
    // Default values for unknown errors
    if (!statusCode) {
        statusCode = 500;
    }
    // Handle validation errors
    if (error instanceof zod_1.ZodError) {
        statusCode = http_1.HTTP_STATUS.BAD_REQUEST;
        const validationErrors = error.issues.map((issue) => {
            const field = issue.path.join(".") || "unknown";
            return {
                field,
                message: issue.message,
            };
        });
        // Log validation errors
        logger_1.default.error({
            message: validationErrors
                .map((err) => `${err.field}: ${err.message}`)
                .join(", "),
            statusCode,
            url: req.originalUrl,
            method: req.method,
            errors: validationErrors,
            ip: req.ip,
            requestId: req.requestId,
            userAgent: req.headers["user-agent"],
        });
        const validationErrorResponse = {
            success: false,
            statusCode,
            message: errors_1.ERROR_MESSAGES.VALIDATION_FAILED,
            errors: validationErrors,
            data: null,
        };
        res.status(statusCode).json(validationErrorResponse);
        return;
    }
    // Log global errors
    logger_1.default.error({
        message,
        statusCode,
        url: req.originalUrl,
        method: req.method,
        ...((0, env_1.isDevelopment)() && { stack: error.stack }),
        ip: req.ip,
        requestId: req.requestId,
        userAgent: req.headers["user-agent"],
    });
    // For production environment, hide error stack traces
    if ((0, env_1.isProduction)() && !error.isOperational) {
        message = "An unexpected error occurred";
    }
    const errorResponse = {
        success: false,
        statusCode,
        message,
        ...((0, env_1.isDevelopment)() && { stack: error.stack }),
        data: null,
    };
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
