/**
 * Audit Log Schema
 * Zod validation schemas for audit log endpoints
 */

import { z } from 'zod'

import { SORT_ORDER } from '@constants/pagination'
import { paginationSchema, sortingSchema } from '@schema/shared.schema'

/**
 * Audit log ID schema
 */
export const auditLogIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid audit log ID format' }),
})

/**
 * Actor type schema
 */
export const actorTypeSchema = z.enum(['user', 'system', 'api_key'])

/**
 * Audit log list query schema
 */
export const auditLogListSchema = paginationSchema.merge(sortingSchema).extend({
  action: z.string().optional(), // Supports namespaced actions like 'user.logged_in'
  actorType: actorTypeSchema.optional(),
  actorId: z.string().uuid().optional(),
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  success: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
  startDate: z
    .string()
    .datetime({ message: 'Invalid date format for start date' })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: 'Invalid date format for end date' })
    .optional(),
  sort: z
    .enum(['occurredAt', 'createdAt', 'action'])
    .optional()
    .default('occurredAt'),
  order: z
    .enum([SORT_ORDER.ASC, SORT_ORDER.DESC])
    .optional()
    .default(SORT_ORDER.DESC),
})

/**
 * Type inference for audit log list schema
 */
export type AuditLogListInput = z.infer<typeof auditLogListSchema>
