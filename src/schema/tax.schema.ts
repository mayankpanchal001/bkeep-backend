/**
 * Tax Schema
 * Zod validation schemas for tax-related requests
 */

import { z } from 'zod'

import {
  paginationSortingSearchSchema,
  statusFilterSchema,
} from '@schema/shared.schema'

/**
 * Valid sort fields for taxes
 */
export const TAX_SORT_FIELDS = [
  'name',
  'type',
  'rate',
  'isActive',
  'createdAt',
  'updatedAt',
] as const

/**
 * Tax type enum for validation
 */
export const taxTypeEnum = z.enum(['normal', 'compound', 'withholding'])

/**
 * Tax list query schema
 * Includes pagination, sorting, search, and filtering
 */
export const taxListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z.enum(TAX_SORT_FIELDS).optional().default('name'),
    type: taxTypeEnum.optional(),
  })

/**
 * Type inference for tax list schema
 */
export type TaxListInput = z.infer<typeof taxListSchema>

/**
 * Tax ID schema
 * Validates UUID format for tax ID
 */
export const taxIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tax ID format' }),
})

/**
 * Create tax schema
 * Validates data for creating a new tax
 */
export const createTaxSchema = z.object({
  name: z
    .string()
    .min(1, 'Tax name is required')
    .max(255, 'Tax name must not exceed 255 characters'),
  type: taxTypeEnum.default('normal'),
  rate: z.coerce
    .number({ message: 'Tax rate must be a number' })
    .min(0, 'Tax rate must be 0 or greater')
    .max(100, 'Tax rate must not exceed 100'),
  isActive: z.boolean().optional().default(true),
})

/**
 * Type inference for create tax schema
 */
export type CreateTaxInput = z.infer<typeof createTaxSchema>

/**
 * Update tax schema
 * Validates data for updating a tax
 */
export const updateTaxSchema = z.object({
  name: z
    .string()
    .min(1, 'Tax name is required')
    .max(255, 'Tax name must not exceed 255 characters')
    .optional(),
  type: taxTypeEnum.optional(),
  rate: z.coerce
    .number({ message: 'Tax rate must be a number' })
    .min(0, 'Tax rate must be 0 or greater')
    .max(100, 'Tax rate must not exceed 100')
    .optional(),
  isActive: z.boolean().optional(),
})

/**
 * Type inference for update tax schema
 */
export type UpdateTaxInput = z.infer<typeof updateTaxSchema>
