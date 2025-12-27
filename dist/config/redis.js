"use strict";
/**
 * Redis configuration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bullMQConnection = exports.redisConfig = void 0;
exports.createRedisClient = createRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = __importDefault(require("./logger"));
/**
 * Redis TLS configuration
 */
const getTlsConfig = () => {
    if (!env_1.env.REDIS_SSL) {
        return {};
    }
    return {
        tls: {
            rejectUnauthorized: false,
        },
    };
};
/**
 * Redis connection configuration
 */
exports.redisConfig = {
    host: env_1.env.REDIS_HOST,
    port: env_1.env.REDIS_PORT,
    db: env_1.env.REDIS_DB,
    ...(env_1.env.REDIS_USERNAME ? { username: env_1.env.REDIS_USERNAME } : {}),
    ...(env_1.env.REDIS_PASSWORD ? { password: env_1.env.REDIS_PASSWORD } : {}),
    ...getTlsConfig(),
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    enableReadyCheck: true,
    lazyConnect: false,
};
/**
 * BullMQ connection options
 */
exports.bullMQConnection = {
    host: env_1.env.REDIS_HOST,
    port: env_1.env.REDIS_PORT,
    ...(env_1.env.REDIS_USERNAME ? { username: env_1.env.REDIS_USERNAME } : {}),
    ...(env_1.env.REDIS_PASSWORD ? { password: env_1.env.REDIS_PASSWORD } : {}),
    db: env_1.env.REDIS_DB,
    ...getTlsConfig(),
    maxRetriesPerRequest: null,
};
/**
 * Create and connect Redis client
 */
function createRedisClient() {
    const client = new ioredis_1.default(exports.redisConfig);
    client.on("connect", () => {
        logger_1.default.info("Redis client connecting...");
    });
    client.on("ready", () => {
        logger_1.default.info("Redis client ready and connected");
    });
    client.on("error", (error) => {
        logger_1.default.error("Redis client error:", error);
    });
    client.on("close", () => {
        logger_1.default.info("Redis client connection closed");
    });
    client.on("reconnecting", () => {
        logger_1.default.warn("Redis client reconnecting...");
    });
    return client;
}
