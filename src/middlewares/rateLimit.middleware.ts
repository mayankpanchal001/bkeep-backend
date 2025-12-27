/**
 * Rate limit middleware configuration
 *
 * Features:
 * - General rate limiter for all routes
 * - Strict rate limiter for authentication endpoints
 * - Rate limiter for password reset endpoints
 * - Rate limiter for OAuth endpoints
 */
import rateLimit from 'express-rate-limit'

import { ERROR_MESSAGES, RATE_LIMITS } from '@constants/index'

/**
 * General rate limiter for all routes
 */
export const generalRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL_WINDOW_MS,
  max: RATE_LIMITS.GENERAL_MAX_REQUESTS,
  message: {
    success: false,
    message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS,
  max: RATE_LIMITS.AUTH_MAX_REQUESTS,
  message: {
    success: false,
    message: ERROR_MESSAGES.TOO_MANY_AUTH_ATTEMPTS,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
})

/**
 * Rate limiter for password reset endpoints
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.PASSWORD_RESET_WINDOW_MS,
  max: RATE_LIMITS.PASSWORD_RESET_MAX_REQUESTS,
  message: {
    success: false,
    message: ERROR_MESSAGES.TOO_MANY_PASSWORD_RESET_ATTEMPTS,
  },
  standardHeaders: true,
  legacyHeaders: false,
})
