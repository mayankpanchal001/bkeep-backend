/**
 * Role Schema
 * Zod validation schemas for role-related requests
 */

import { z } from 'zod'

import {
  paginationSortingSearchSchema,
  statusFilterSchema,
} from '@schema/shared.schema'

/**
 * Valid sort fields for roles
 */
export const ROLE_SORT_FIELDS = [
  'name',
  'displayName',
  'createdAt',
  'updatedAt',
] as const

/**
 * Role list query schema
 * Includes pagination, sorting, search, and status filter
 */
export const roleListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z.enum(ROLE_SORT_FIELDS).optional().default('displayName'),
  })

/**
 * Role ID parameter schema
 * Validates UUID format for role ID
 */
export const roleIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid role ID format' }),
})

/**
 * Type inference for role list schema
 */
export type RoleListInput = z.infer<typeof roleListSchema>

/**
 * Type inference for role ID schema
 */
export type RoleIdInput = z.infer<typeof roleIdSchema>

/**
 * Update role permissions schema
 * Validates array of permission IDs to assign to a role
 */
export const updateRolePermissionsSchema = z.object({
  permissionIds: z
    .array(z.string().uuid({ message: 'Invalid permission ID format' }))
    .min(0, { message: 'Permission IDs array cannot be negative' })
    .default([]),
})

/**
 * Type inference for update role permissions schema
 */
export type UpdateRolePermissionsInput = z.infer<
  typeof updateRolePermissionsSchema
>
