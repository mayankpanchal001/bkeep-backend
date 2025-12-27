"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isProduction = exports.isDevelopment = exports.env = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const envPath = (0, node_path_1.join)(__dirname, "..", "..", ".env");
if ((0, node_fs_1.existsSync)(envPath)) {
    dotenv_1.default.config({ path: envPath });
}
/**
 * Environment schema validation
 */
const envSchema = zod_1.z.object({
    API_PREFIX: zod_1.z.string().default("/api/v1"),
    LOG_LEVEL: zod_1.z.enum(["debug", "info", "warn", "error"]).default("info"),
    CORS_ORIGIN: zod_1.z
        .string()
        .optional()
        .transform((val) => {
        if (!val)
            return [];
        // Support comma-separated or space-separated origins
        // Remove trailing slashes and trim whitespace
        return val
            .split(/[\s,]+/)
            .map((origin) => origin.trim().replace(/\/+$/, ""))
            .filter(Boolean);
    })
        .pipe(zod_1.z.array(zod_1.z.string().url())),
    // Server configuration
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("production"),
    PORT: zod_1.z
        .string()
        .default("8000")
        .transform(Number)
        .pipe(zod_1.z.number().min(1).max(65535)),
    HOST: zod_1.z.string().default("localhost"),
    SHUTDOWN_TIMEOUT_MS: zod_1.z
        .string()
        .default("10000")
        .transform(Number)
        .pipe(zod_1.z.number().min(1000).max(60000)),
    // Database configuration
    DATABASE_URL: zod_1.z.string().url().optional(),
    DB_HOST: zod_1.z.string().default("localhost"),
    DB_PORT: zod_1.z
        .string()
        .default("5432")
        .transform(Number)
        .pipe(zod_1.z.number().min(1).max(65535)),
    DB_NAME: zod_1.z.string().default("myapp_test"),
    DB_USER: zod_1.z.string().default("postgres"),
    DB_PASSWORD: zod_1.z.string().default(""),
    DB_SSL: zod_1.z
        .string()
        .default("false")
        .transform((val) => val === "true"),
    // JWT configuration
    ACCESS_TOKEN_SECRET: zod_1.z.string().default("access-token-secret"),
    ACCESS_TOKEN_EXPIRY: zod_1.z.string().default("1h"),
    REFRESH_TOKEN_SECRET: zod_1.z.string().default("refresh-token-secret"),
    REFRESH_TOKEN_EXPIRY: zod_1.z.string().default("7d"),
    SESSION_SECRET: zod_1.z.string().default("session-secret"),
    // Client configuration
    FRONTEND_URL: zod_1.z.string().url().default("https://app.bkeep.ca"),
    // WebAuthn configuration
    WEBAUTHN_RP_ID: zod_1.z.string().optional(),
    // Email configuration
    EMAIL_FROM: zod_1.z.string().email().default("info@bkeep.ca").optional(),
    EMAIL_FROM_NAME: zod_1.z.string().default("BKeep").optional(),
    // AWS SES configuration
    AWS_REGION: zod_1.z.string().default("us-east-1"),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    // Redis configuration
    REDIS_HOST: zod_1.z.string().default("localhost"),
    REDIS_PORT: zod_1.z
        .string()
        .default("6379")
        .transform(Number)
        .pipe(zod_1.z.number().min(1).max(65535)),
    REDIS_USERNAME: zod_1.z
        .string()
        .optional()
        .transform((val) => val ?? undefined),
    REDIS_PASSWORD: zod_1.z
        .string()
        .optional()
        .transform((val) => val ?? undefined),
    REDIS_DB: zod_1.z
        .string()
        .default("0")
        .transform(Number)
        .pipe(zod_1.z.number().min(0).max(15)),
    REDIS_SSL: zod_1.z
        .string()
        .default("false")
        .transform((val) => val === "true"),
    // Mail Queue configuration
    MAIL_QUEUE_ENABLED: zod_1.z
        .string()
        .default("true")
        .transform((val) => val === "true"),
    MAIL_QUEUE_ATTEMPTS: zod_1.z
        .string()
        .default("3")
        .transform(Number)
        .pipe(zod_1.z.number().min(1).max(10)),
    MAIL_QUEUE_BACKOFF_DELAY: zod_1.z
        .string()
        .default("5000")
        .transform(Number)
        .pipe(zod_1.z.number().min(1000)),
});
/**
 * Parse and validate environment variables
 */
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const missingVars = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
            throw new Error(`Environment validation failed:\n${missingVars.join("\n")}`);
        }
        throw error;
    }
};
/**
 * Validated environment configuration
 */
exports.env = parseEnv();
/**
 * Check if running in development, production, or test mode
 */
const isDevelopment = () => exports.env.NODE_ENV === "development";
exports.isDevelopment = isDevelopment;
const isProduction = () => exports.env.NODE_ENV === "production";
exports.isProduction = isProduction;
const isTest = () => exports.env.NODE_ENV === "test";
exports.isTest = isTest;
