"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetRateLimiter = exports.authRateLimiter = exports.generalRateLimiter = void 0;
/**
 * Rate limit middleware configuration
 *
 * Features:
 * - General rate limiter for all routes
 * - Strict rate limiter for authentication endpoints
 * - Rate limiter for password reset endpoints
 * - Rate limiter for OAuth endpoints
 */
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_1 = require("../constants/index");
/**
 * General rate limiter for all routes
 */
exports.generalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: index_1.RATE_LIMITS.GENERAL_WINDOW_MS,
    max: index_1.RATE_LIMITS.GENERAL_MAX_REQUESTS,
    message: {
        success: false,
        message: index_1.ERROR_MESSAGES.TOO_MANY_REQUESTS,
    },
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * Strict rate limiter for authentication endpoints
 */
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: index_1.RATE_LIMITS.AUTH_WINDOW_MS,
    max: index_1.RATE_LIMITS.AUTH_MAX_REQUESTS,
    message: {
        success: false,
        message: index_1.ERROR_MESSAGES.TOO_MANY_AUTH_ATTEMPTS,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});
/**
 * Rate limiter for password reset endpoints
 */
exports.passwordResetRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: index_1.RATE_LIMITS.PASSWORD_RESET_WINDOW_MS,
    max: index_1.RATE_LIMITS.PASSWORD_RESET_MAX_REQUESTS,
    message: {
        success: false,
        message: index_1.ERROR_MESSAGES.TOO_MANY_PASSWORD_RESET_ATTEMPTS,
    },
    standardHeaders: true,
    legacyHeaders: false,
});
