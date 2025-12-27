/**
 * Tax Group Schema
 * Zod validation schemas for tax group-related requests
 */

import { z } from 'zod'

import {
  paginationSortingSearchSchema,
  statusFilterSchema,
} from '@schema/shared.schema'

/**
 * Valid sort fields for tax groups
 */
export const TAX_GROUP_SORT_FIELDS = [
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
] as const

/**
 * Tax group list query schema
 * Includes pagination, sorting, search, and filtering
 */
export const taxGroupListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z.enum(TAX_GROUP_SORT_FIELDS).optional().default('name'),
  })

/**
 * Type inference for tax group list schema
 */
export type TaxGroupListInput = z.infer<typeof taxGroupListSchema>

/**
 * Tax group ID schema
 * Validates UUID format for tax group ID
 */
export const taxGroupIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tax group ID format' }),
})

/**
 * Create tax group schema
 * Validates data for creating a new tax group
 */
export const createTaxGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Tax group name is required')
    .max(255, 'Tax group name must not exceed 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  taxIds: z
    .array(z.string().uuid({ message: 'Invalid tax ID format' }))
    .min(1, 'At least one tax is required')
    .max(10, 'Maximum 10 taxes per group'),
})

/**
 * Type inference for create tax group schema
 */
export type CreateTaxGroupInput = z.infer<typeof createTaxGroupSchema>

/**
 * Update tax group schema
 * Validates data for updating a tax group
 */
export const updateTaxGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Tax group name is required')
    .max(255, 'Tax group name must not exceed 255 characters')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  isActive: z.boolean().optional(),
  taxIds: z
    .array(z.string().uuid({ message: 'Invalid tax ID format' }))
    .min(1, 'At least one tax is required')
    .max(10, 'Maximum 10 taxes per group')
    .optional(),
})

/**
 * Type inference for update tax group schema
 */
export type UpdateTaxGroupInput = z.infer<typeof updateTaxGroupSchema>

/**
 * Calculate tax schema
 * Validates data for calculating tax with a tax group
 */
export const calculateTaxGroupSchema = z.object({
  amount: z.coerce
    .number({ message: 'Amount must be a number' })
    .min(0, 'Amount must be 0 or greater'),
})

/**
 * Type inference for calculate tax group schema
 */
export type CalculateTaxGroupInput = z.infer<typeof calculateTaxGroupSchema>
