"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMITS = void 0;
/**
 * Rate Limiting
 * Standardized rate limiting settings used throughout the application
 */
exports.RATE_LIMITS = {
    GENERAL_WINDOW_MS: 15 * 60 * 1000,
    GENERAL_MAX_REQUESTS: 300,
    AUTH_WINDOW_MS: 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: 10,
    PASSWORD_RESET_WINDOW_MS: 15 * 60 * 1000,
    PASSWORD_RESET_MAX_REQUESTS: 3,
};
