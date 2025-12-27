"use strict";
/**
 * Mail Worker
 * Standalone worker process to handle email queue jobs
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../config/logger"));
const mail_queue_1 = require("../queues/mail.queue");
const mail_service_1 = require("../services/mail.service");
/**
 * Graceful shutdown handler
 */
let isShuttingDown = false;
async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    logger_1.default.info(`${signal} received, starting graceful shutdown...`);
    try {
        const { closeMailQueue } = await Promise.resolve().then(() => __importStar(require("../queues/mail.queue")));
        const { closeMailTransporter } = await Promise.resolve().then(() => __importStar(require("../services/mail.service")));
        // Close mail queue
        await closeMailQueue();
        // Close mail transporter
        closeMailTransporter();
        logger_1.default.info("Mail worker shut down gracefully");
        // eslint-disable-next-line node/no-process-exit
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error("Error during graceful shutdown:", error);
        // eslint-disable-next-line node/no-process-exit
        process.exit(1);
    }
}
/**
 * Start mail worker
 */
async function startMailWorker() {
    try {
        logger_1.default.info("Starting mail worker...");
        // Verify mail connection
        const isConnected = await (0, mail_service_1.verifyMailConnection)();
        if (!isConnected) {
            logger_1.default.warn("Mail connection verification failed, but worker will continue");
        }
        // Initialize mail queue, events, and worker
        (0, mail_queue_1.initializeMailQueue)();
        (0, mail_queue_1.initializeQueueEvents)();
        (0, mail_queue_1.processMailQueue)();
        logger_1.default.info("Mail worker ready - listening for jobs");
        // Setup graceful shutdown handlers
        process.on("SIGTERM", () => {
            void gracefulShutdown("SIGTERM");
        });
        process.on("SIGINT", () => {
            void gracefulShutdown("SIGINT");
        });
        // Handle uncaught errors
        process.on("uncaughtException", (error) => {
            logger_1.default.error("Uncaught exception in mail worker:", error);
            void gracefulShutdown("UNCAUGHT_EXCEPTION");
        });
        process.on("unhandledRejection", (reason) => {
            logger_1.default.error("Unhandled rejection in mail worker:", {
                reason: reason instanceof Error
                    ? {
                        message: reason.message,
                        stack: reason.stack,
                        name: reason.name,
                    }
                    : reason,
            });
            void gracefulShutdown("UNHANDLED_REJECTION");
        });
    }
    catch (error) {
        logger_1.default.error("Failed to start mail worker:", error);
        throw error;
    }
}
// Start the worker
void startMailWorker();
