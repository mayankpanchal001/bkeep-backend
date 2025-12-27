/**
 * Rate Limiting
 * Standardized rate limiting settings used throughout the application
 */
export const RATE_LIMITS = {
  GENERAL_WINDOW_MS: 15 * 60 * 1000,
  GENERAL_MAX_REQUESTS: 300,
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX_REQUESTS: 10,
  PASSWORD_RESET_WINDOW_MS: 15 * 60 * 1000,
  PASSWORD_RESET_MAX_REQUESTS: 3,
} as const
