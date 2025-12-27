/**
 * Shared Schema
 * Reusable Zod validation schemas for pagination, filtering, and sorting
 */

import { z } from 'zod'

import { PAGINATION_DEFAULTS, SORT_ORDER } from '@constants/pagination'
import { VALIDATION_MESSAGES, VALIDATION_RULES } from '@constants/validation'

/**
 * Reusable field validation schemas
 */

/**
 * Email validation schema
 * Reusable email field validation
 */
export const emailSchema = z
  .string()
  .email({ message: 'Invalid email format' })
  .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, {
    message: `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
  })

/**
 * Password validation schema
 * Reusable password field validation
 */
export const passwordSchema = z
  .string()
  .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, {
    message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH,
  })
  .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
    message: VALIDATION_MESSAGES.PASSWORD_MAX_LENGTH,
  })

/**
 * Token validation schema
 * Reusable token field validation (for invitation tokens, reset tokens, etc.)
 */
export const tokenSchema = z.string().min(1, { message: 'Token is required' })

/**
 * Base pagination schema
 * Used for query parameters in list endpoints
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default(String(PAGINATION_DEFAULTS.PAGE_DEFAULT))
    .transform((val) => {
      const page = Number.parseInt(val, 10)
      return Number.isNaN(page) || page < PAGINATION_DEFAULTS.PAGE_MIN
        ? PAGINATION_DEFAULTS.PAGE_DEFAULT
        : page
    }),
  limit: z
    .string()
    .optional()
    .default(String(PAGINATION_DEFAULTS.LIMIT_DEFAULT))
    .transform((val) => {
      const limit = Number.parseInt(val, 10)
      if (Number.isNaN(limit) || limit < PAGINATION_DEFAULTS.LIMIT_MIN) {
        return PAGINATION_DEFAULTS.LIMIT_DEFAULT
      }
      return Math.min(limit, PAGINATION_DEFAULTS.LIMIT_MAX)
    }),
})

/**
 * Base sorting schema
 * Used for query parameters to specify sort field and order
 */
export const sortingSchema = z.object({
  sort: z.string().optional(),
  order: z
    .enum([SORT_ORDER.ASC, SORT_ORDER.DESC])
    .optional()
    .default(SORT_ORDER.ASC),
})

/**
 * Base search/filter schema
 * Used for query parameters to search and filter results
 */
export const searchSchema = z.object({
  search: z
    .string()
    .min(1, { message: 'Search term must not be empty' })
    .max(255, { message: 'Search term must not exceed 255 characters' })
    .optional(),
})

/**
 * Date range filter schema
 * Used for filtering by date ranges
 */
export const dateRangeSchema = z.object({
  from: z
    .string()
    .datetime({ message: 'Invalid date format for "from" date' })
    .optional(),
  to: z
    .string()
    .datetime({ message: 'Invalid date format for "to" date' })
    .optional(),
})

/**
 * Status filter schema
 * Used for filtering by active/inactive status
 */
export const statusFilterSchema = z.object({
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
})

/**
 * Combined pagination and sorting schema
 * Most common combination for list endpoints
 */
export const paginationSortingSchema = paginationSchema.merge(sortingSchema)

/**
 * Combined pagination, sorting, and search schema
 * Full-featured schema for advanced list endpoints
 */
export const paginationSortingSearchSchema =
  paginationSortingSchema.merge(searchSchema)

/**
 * Complete filtering schema
 * Includes pagination, sorting, search, date range, and status filters
 */
export const completeFilterSchema = paginationSortingSearchSchema
  .merge(dateRangeSchema)
  .merge(statusFilterSchema)

/**
 * Type inference for pagination schema
 */
export type PaginationInput = z.infer<typeof paginationSchema>

/**
 * Type inference for sorting schema
 */
export type SortingInput = z.infer<typeof sortingSchema>

/**
 * Type inference for search schema
 */
export type SearchInput = z.infer<typeof searchSchema>

/**
 * Type inference for date range schema
 */
export type DateRangeInput = z.infer<typeof dateRangeSchema>

/**
 * Type inference for status filter schema
 */
export type StatusFilterInput = z.infer<typeof statusFilterSchema>

/**
 * Type inference for pagination and sorting schema
 */
export type PaginationSortingInput = z.infer<typeof paginationSortingSchema>

/**
 * Type inference for pagination, sorting, and search schema
 */
export type PaginationSortingSearchInput = z.infer<
  typeof paginationSortingSearchSchema
>

/**
 * Type inference for complete filter schema
 */
export type CompleteFilterInput = z.infer<typeof completeFilterSchema>

/**
 * Helper function to calculate offset from page and limit
 */
export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit
}

/**
 * Helper function to get pagination metadata
 */
export const getPaginationMetadata = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit)
  const offset = calculateOffset(page, limit)

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}
