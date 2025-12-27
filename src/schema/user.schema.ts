/**
 * User Schema
 * Zod validation schemas for user-related requests
 */

import { z } from 'zod'

import { VALIDATION_MESSAGES, VALIDATION_RULES } from '@constants/validation'
import {
  paginationSortingSearchSchema,
  passwordSchema,
  statusFilterSchema,
  tokenSchema,
} from '@schema/shared.schema'

/**
 * Valid sort fields for users
 */
export const USER_SORT_FIELDS = [
  'name',
  'email',
  'createdAt',
  'updatedAt',
  'lastLoggedInAt',
] as const

/**
 * User list query schema
 * Includes pagination, sorting, search, and status filter
 */
export const userListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z.enum(USER_SORT_FIELDS).optional().default('createdAt'),
    isVerified: z
      .string()
      .transform((val) => val === 'true')
      .pipe(z.boolean())
      .optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .pipe(z.boolean())
      .optional(),
  })

/**
 * Type inference for user list schema
 */
export type UserListInput = z.infer<typeof userListSchema>

/**
 * User ID schema
 * Validates UUID format for user ID
 */
export const userIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid user ID format' }),
})

/**
 * Type inference for user ID schema
 */
export type UserIdInput = z.infer<typeof userIdSchema>

/**
 * Update user activation status schema
 */
export const updateUserActivationSchema = z.object({
  isActive: z.boolean({ message: 'isActive is required' }),
})

/**
 * Type inference for update user activation schema
 */
export type UpdateUserActivationInput = z.infer<
  typeof updateUserActivationSchema
>

/**
 * Update user roles schema
 */
export const updateUserRolesSchema = z.object({
  roleIds: z
    .array(z.string().uuid({ message: 'Invalid role ID format' }))
    .min(1, { message: 'At least one role ID is required' }),
})

/**
 * Type inference for update user roles schema
 */
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>

/**
 * User invitation schema
 */
export const userInvitationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Name is required' })
    .max(VALIDATION_RULES.NAME_MAX_LENGTH, {
      message: `Name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
    }),
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .max(255, { message: 'Email must be at most 255 characters' }),
  roleId: z.string().uuid({ message: 'Invalid role ID format' }),
})

/**
 * Type inference for user invitation schema
 */
export type UserInvitationInput = z.infer<typeof userInvitationSchema>

/**
 * Verify invitation schema
 * Validates query parameters for invitation verification
 */
export const verifyInvitationSchema = z.object({
  token: tokenSchema.refine((val) => val.length > 0, {
    message: VALIDATION_MESSAGES.INVITATION_TOKEN_REQUIRED,
  }),
})

/**
 * Type inference for verify invitation schema
 */
export type VerifyInvitationInput = z.infer<typeof verifyInvitationSchema>

/**
 * Accept invitation schema
 * Validates request body for invitation acceptance
 */
export const acceptInvitationSchema = z.object({
  token: tokenSchema.refine((val) => val.length > 0, {
    message: VALIDATION_MESSAGES.INVITATION_TOKEN_REQUIRED,
  }),
  password: passwordSchema.optional(),
})

/**
 * Type inference for accept invitation schema
 */
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>

/**
 * Valid sort fields for invitations
 */
export const INVITATION_SORT_FIELDS = [
  'email',
  'createdAt',
  'updatedAt',
] as const

/**
 * Invitation list query schema
 * Includes pagination, sorting, and search
 */
export const invitationListSchema = paginationSortingSearchSchema.extend({
  sort: z.enum(INVITATION_SORT_FIELDS).optional().default('createdAt'),
})

/**
 * Type inference for invitation list schema
 */
export type InvitationListInput = z.infer<typeof invitationListSchema>

/**
 * Invitation ID schema
 * Validates UUID format for invitation ID
 */
export const invitationIdSchema = z.object({
  invitationId: z.string().uuid({ message: 'Invalid invitation ID format' }),
})

/**
 * Type inference for invitation ID schema
 */
export type InvitationIdInput = z.infer<typeof invitationIdSchema>
