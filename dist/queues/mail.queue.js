"use strict";
/**
 * Mail Queue
 * Manages email sending jobs using BullMQ
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMailQueue = initializeMailQueue;
exports.initializeQueueEvents = initializeQueueEvents;
exports.getMailQueue = getMailQueue;
exports.processMailQueue = processMailQueue;
exports.addMailJob = addMailJob;
exports.getMailQueueStats = getMailQueueStats;
exports.closeMailQueue = closeMailQueue;
const bullmq_1 = require("bullmq");
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const redis_1 = require("../config/redis");
const mail_1 = require("../constants/mail");
const mail_service_1 = require("../services/mail.service");
/**
 * Mail queue instance
 */
let mailQueue = null;
/**
 * Mail worker instance
 */
let mailWorker = null;
/**
 * Queue events instance
 */
let queueEvents = null;
/**
 * Default job options
 */
const defaultJobOptions = {
    attempts: env_1.env.MAIL_QUEUE_ATTEMPTS,
    backoff: {
        type: "exponential",
        delay: env_1.env.MAIL_QUEUE_BACKOFF_DELAY,
    },
    removeOnComplete: true,
    removeOnFail: false,
};
/**
 * Initialize mail queue
 */
function initializeMailQueue() {
    if (mailQueue) {
        return mailQueue;
    }
    mailQueue = new bullmq_1.Queue(mail_1.MAIL_QUEUE_NAME, {
        connection: redis_1.bullMQConnection,
        defaultJobOptions,
    });
    logger_1.default.info("Mail queue initialized");
    return mailQueue;
}
/**
 * Initialize queue events
 */
function initializeQueueEvents() {
    if (queueEvents) {
        return queueEvents;
    }
    queueEvents = new bullmq_1.QueueEvents(mail_1.MAIL_QUEUE_NAME, {
        connection: redis_1.bullMQConnection,
    });
    // Queue event listeners
    queueEvents.on("waiting", ({ jobId }) => {
        logger_1.default.debug(`Mail job ${jobId} is waiting`);
    });
    queueEvents.on("active", ({ jobId }) => {
        logger_1.default.debug(`Mail job ${jobId} started processing`);
    });
    queueEvents.on("completed", ({ jobId, returnvalue }) => {
        const result = returnvalue;
        logger_1.default.info(`Mail job ${jobId} completed`, {
            jobId,
            success: result?.success,
            messageId: result?.messageId,
        });
    });
    queueEvents.on("failed", ({ jobId, failedReason }) => {
        logger_1.default.error(`Mail job ${jobId} failed:`, {
            jobId,
            error: failedReason,
        });
    });
    queueEvents.on("stalled", ({ jobId }) => {
        logger_1.default.warn(`Mail job ${jobId} stalled`);
    });
    logger_1.default.info("Mail queue events initialized");
    return queueEvents;
}
/**
 * Get mail queue instance
 */
function getMailQueue() {
    if (!mailQueue) {
        return initializeMailQueue();
    }
    return mailQueue;
}
/**
 * Process mail jobs (initialize worker)
 */
function processMailQueue() {
    if (mailWorker) {
        return mailWorker;
    }
    mailWorker = new bullmq_1.Worker(mail_1.MAIL_QUEUE_NAME, async (job) => {
        logger_1.default.info(`Processing mail job ${job.id}`, {
            jobId: job.id,
            to: job.data.to,
            template: job.data.template,
            attemptsMade: job.attemptsMade,
        });
        try {
            const result = await (0, mail_service_1.sendMail)(job.data);
            if (!result.success) {
                throw new Error(result.error ?? "Failed to send email");
            }
            return result;
        }
        catch (error) {
            logger_1.default.error(`Mail job ${job.id} processing error:`, error);
            throw error;
        }
    }, {
        connection: redis_1.bullMQConnection,
        concurrency: mail_1.MAIL_WORKER_CONCURRENCY,
    });
    // Worker event listeners
    mailWorker.on("completed", (job) => {
        logger_1.default.debug(`Worker completed job ${job.id}`);
    });
    mailWorker.on("failed", (job, error) => {
        if (job) {
            logger_1.default.error(`Worker failed job ${job.id}:`, {
                jobId: job.id,
                error: error.message,
                attemptsMade: job.attemptsMade,
                maxAttempts: job.opts.attempts,
            });
        }
    });
    mailWorker.on("error", (error) => {
        logger_1.default.error("Mail worker error:", error);
    });
    logger_1.default.info(`BullMQ worker initialized (concurrency: ${mail_1.MAIL_WORKER_CONCURRENCY})`);
    return mailWorker;
}
/**
 * Add mail job to queue
 */
async function addMailJob(mailOptions, options) {
    if (!env_1.env.MAIL_QUEUE_ENABLED) {
        // If queue is disabled, send email directly
        logger_1.default.info("Mail queue disabled, sending email directly");
        await (0, mail_service_1.sendMail)(mailOptions);
        return null;
    }
    const queue = getMailQueue();
    const job = await queue.add(mail_1.MAIL_JOB_NAMES.SEND_MAIL, mailOptions, {
        ...defaultJobOptions,
        ...options,
    });
    logger_1.default.info(`Mail job ${job.id} added to queue`, {
        jobId: job.id,
        to: mailOptions.to,
        template: mailOptions.template,
    });
    return job;
}
/**
 * Get mail queue statistics
 */
async function getMailQueueStats() {
    const queue = getMailQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
}
/**
 * Close mail queue and worker
 */
async function closeMailQueue() {
    const promises = [];
    if (mailWorker) {
        promises.push(mailWorker.close());
        mailWorker = null;
    }
    if (queueEvents) {
        promises.push(queueEvents.close());
        queueEvents = null;
    }
    if (mailQueue) {
        promises.push(mailQueue.close());
        mailQueue = null;
    }
    await Promise.all(promises);
    logger_1.default.info("Mail queue closed");
}
