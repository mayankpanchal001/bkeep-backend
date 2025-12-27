/**
 * Tax Exemption Schema
 * Zod validation schemas for tax exemption-related requests
 */

import { z } from 'zod'

import {
  paginationSortingSearchSchema,
  statusFilterSchema,
} from '@schema/shared.schema'

/**
 * Tax exemption type enum for validation
 */
export const taxExemptionTypeEnum = z.enum([
  'resale',
  'non_profit',
  'government',
  'other',
])

/**
 * Valid sort fields for tax exemptions
 */
export const TAX_EXEMPTION_SORT_FIELDS = [
  'exemptionType',
  'certificateExpiry',
  'isActive',
  'createdAt',
  'updatedAt',
] as const

/**
 * Tax exemption list query schema
 * Includes pagination, sorting, search, and filtering
 */
export const taxExemptionListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z.enum(TAX_EXEMPTION_SORT_FIELDS).optional().default('createdAt'),
    contactId: z
      .string()
      .uuid({ message: 'Invalid contact ID format' })
      .optional(),
    taxId: z.string().uuid({ message: 'Invalid tax ID format' }).optional(),
    exemptionType: taxExemptionTypeEnum.optional(),
    expired: z.boolean().optional(),
  })

/**
 * Type inference for tax exemption list schema
 */
export type TaxExemptionListInput = z.infer<typeof taxExemptionListSchema>

/**
 * Tax exemption ID schema
 * Validates UUID format for tax exemption ID
 */
export const taxExemptionIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tax exemption ID format' }),
})

/**
 * Create tax exemption schema
 * Validates data for creating a new tax exemption
 */
export const createTaxExemptionSchema = z.object({
  contactId: z.string().uuid({ message: 'Invalid contact ID format' }),
  taxId: z
    .string()
    .uuid({ message: 'Invalid tax ID format' })
    .nullable()
    .optional(),
  exemptionType: taxExemptionTypeEnum.default('resale'),
  certificateNumber: z
    .string()
    .max(255, 'Certificate number must not exceed 255 characters')
    .optional(),
  certificateExpiry: z
    .string()
    .date({ message: 'Invalid date format' })
    .optional()
    .nullable(),
  reason: z
    .string()
    .max(1000, 'Reason must not exceed 1000 characters')
    .optional(),
  isActive: z.boolean().optional().default(true),
})

/**
 * Type inference for create tax exemption schema
 */
export type CreateTaxExemptionInput = z.infer<typeof createTaxExemptionSchema>

/**
 * Update tax exemption schema
 * Validates data for updating a tax exemption
 */
export const updateTaxExemptionSchema = z.object({
  taxId: z
    .string()
    .uuid({ message: 'Invalid tax ID format' })
    .nullable()
    .optional(),
  exemptionType: taxExemptionTypeEnum.optional(),
  certificateNumber: z
    .string()
    .max(255, 'Certificate number must not exceed 255 characters')
    .optional(),
  certificateExpiry: z
    .string()
    .date({ message: 'Invalid date format' })
    .optional()
    .nullable(),
  reason: z
    .string()
    .max(1000, 'Reason must not exceed 1000 characters')
    .optional(),
  isActive: z.boolean().optional(),
})

/**
 * Type inference for update tax exemption schema
 */
export type UpdateTaxExemptionInput = z.infer<typeof updateTaxExemptionSchema>
