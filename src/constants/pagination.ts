/**
 * Pagination Constants
 * Standardized pagination constants used throughout the application
 */

/**
 * Pagination default values and limits
 */
export const PAGINATION_DEFAULTS = {
  PAGE_MIN: 1,
  PAGE_DEFAULT: 1,
  LIMIT_MIN: 1,
  LIMIT_MAX: 100,
  LIMIT_DEFAULT: 20,
} as const

/**
 * Sort order options
 */
export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const
