/**
 * Tenant Schema
 * Zod validation schemas for tenant-related requests
 */

import { z } from 'zod'

import {
  paginationSortingSearchSchema,
  statusFilterSchema,
} from '@schema/shared.schema'

/**
 * Valid sort fields for tenants
 */
export const TENANT_SORT_FIELDS = [
  'name',
  'schemaName',
  'isActive',
  'createdAt',
  'updatedAt',
] as const

/**
 * Tenant list query schema
 * Includes pagination, sorting, search, and status filter
 */
export const tenantListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z.enum(TENANT_SORT_FIELDS).optional().default('createdAt'),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .pipe(z.boolean())
      .optional(),
  })

/**
 * Type inference for tenant list schema
 */
export type TenantListInput = z.infer<typeof tenantListSchema>

/**
 * Tenant ID schema
 * Validates UUID format for tenant ID
 */
export const tenantIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tenant ID format' }),
})

/**
 * Type inference for tenant ID schema
 */
export type TenantIdInput = z.infer<typeof tenantIdSchema>

/**
 * Create tenant schema
 */
export const createTenantSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Tenant name is required' })
    .max(255, { message: 'Tenant name must be at most 255 characters' }),
  schemaName: z
    .string()
    .min(1, { message: 'Schema name is required' })
    .max(63, { message: 'Schema name must be at most 63 characters' })
    .regex(/^[a-z][\d_a-z]*$/, {
      message:
        'Schema name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores',
    }),
})

/**
 * Type inference for create tenant schema
 */
export type CreateTenantInput = z.infer<typeof createTenantSchema>

/**
 * Update tenant schema
 * Note: schemaName is immutable and cannot be updated
 * Using .strict() to reject any unknown fields including schemaName
 */
export const updateTenantSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'Tenant name is required' })
      .max(255, { message: 'Tenant name must be at most 255 characters' })
      .optional(),
    isActive: z.boolean({ message: 'isActive is required' }).optional(),
  })
  .strict()

/**
 * Type inference for update tenant schema
 */
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
