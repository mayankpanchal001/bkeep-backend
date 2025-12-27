"use strict";
/**
 * Server Entry Point
 * Starts the Express server and handles graceful shutdown
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./config/logger"));
/**
 * Centralized shutdown function
 * Handles all process exit scenarios with proper logging
 */
const shutdown = (code, reason) => {
    logger_1.default.info(`Shutting down server: ${reason}`);
    logger_1.default.info(`Exit code: ${code}`);
    // eslint-disable-next-line node/no-process-exit
    process.exit(code);
};
/**
 * Start the Express server
 * @returns Promise that resolves when server starts successfully
 */
const startServer = async () => {
    try {
        const server = node_http_1.default.createServer(app_1.default);
        server.listen(env_1.env.PORT, env_1.env.HOST, () => {
            // Use localhost for display when binding to 0.0.0.0 (Docker/all interfaces)
            const displayHost = env_1.env.HOST === "0.0.0.0" ? "localhost" : env_1.env.HOST;
            logger_1.default.info(`🚀 Server running at: http://${displayHost}:${env_1.env.PORT}`);
            logger_1.default.info(`📚 API Documentation: http://${displayHost}:${env_1.env.PORT}/api-docs`);
            logger_1.default.info(`💡 Health check: http://${displayHost}:${env_1.env.PORT}/health`);
            logger_1.default.info(`⏳ Environment: ${env_1.env.NODE_ENV}`);
        });
        // Graceful shutdown handling
        const gracefulShutdown = (signal) => {
            logger_1.default.info(`Received ${signal}. Starting graceful shutdown...`);
            // Store timeout reference so we can clear it if shutdown completes quickly
            const shutdownTimeout = setTimeout(() => {
                logger_1.default.error("Forced shutdown after timeout");
                shutdown(1, "Forced shutdown after timeout");
            }, env_1.env.SHUTDOWN_TIMEOUT_MS);
            server.close(() => {
                logger_1.default.info("Server closed successfully");
                // Clear the timeout since we're shutting down gracefully
                clearTimeout(shutdownTimeout);
                shutdown(0, "Graceful shutdown completed");
            });
        };
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    }
    catch (error) {
        logger_1.default.error("❌ Failed to start server:", error);
        shutdown(1, "Server startup failure");
    }
};
// Start the server if this file is run directly
if (require.main === module) {
    void startServer();
}
exports.default = startServer;
