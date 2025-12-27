/**
 * Account Schema
 * Zod validation schemas for account-related requests
 */

import { z } from 'zod'

import {
  paginationSortingSearchSchema,
  statusFilterSchema,
} from '@schema/shared.schema'

/**
 * Valid sort fields for accounts
 */
export const ACCOUNT_SORT_FIELDS = [
  'name',
  'number',
  'currencyCode',
  'openingBalance',
  'isActive',
  'createdAt',
  'updatedAt',
] as const

/**
 * Account list query schema
 * Includes pagination, sorting, search, and status filter
 */
export const accountListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z.enum(ACCOUNT_SORT_FIELDS).optional().default('createdAt'),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .pipe(z.boolean())
      .optional(),
    currencyCode: z
      .string()
      .length(3, { message: 'Currency code must be 3 characters' })
      .optional(),
  })

/**
 * Type inference for account list schema
 */
export type AccountListInput = z.infer<typeof accountListSchema>

/**
 * Account ID schema
 * Validates UUID format for account ID
 */
export const accountIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid account ID format' }),
})

/**
 * Type inference for account ID schema
 */
export type AccountIdInput = z.infer<typeof accountIdSchema>

/**
 * Create account schema
 */
export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Account name is required' })
    .max(255, { message: 'Account name must be at most 255 characters' }),
  number: z
    .string()
    .max(255, { message: 'Account number must be at most 255 characters' })
    .nullable()
    .optional(),
  type: z
    .string()
    .max(255, { message: 'Account type must be at most 255 characters' })
    .optional()
    .default('bank'),
  currencyCode: z
    .string()
    .length(3, { message: 'Currency code must be 3 characters (ISO 4217)' })
    .optional()
    .default('CAD'),
  openingBalance: z
    .number({ message: 'Opening balance must be a number' })
    .optional()
    .default(0),
  bankName: z
    .string()
    .max(255, { message: 'Bank name must be at most 255 characters' })
    .nullable()
    .optional(),
  isActive: z.boolean().optional().default(true),
})

/**
 * Type inference for create account schema
 */
export type CreateAccountInput = z.infer<typeof createAccountSchema>

/**
 * Update account schema
 */
export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Account name is required' })
    .max(255, { message: 'Account name must be at most 255 characters' })
    .optional(),
  number: z
    .string()
    .max(255, { message: 'Account number must be at most 255 characters' })
    .nullable()
    .optional(),
  type: z
    .string()
    .max(255, { message: 'Account type must be at most 255 characters' })
    .optional(),
  currencyCode: z
    .string()
    .length(3, { message: 'Currency code must be 3 characters (ISO 4217)' })
    .optional(),
  openingBalance: z
    .number({ message: 'Opening balance must be a number' })
    .optional(),
  bankName: z
    .string()
    .max(255, { message: 'Bank name must be at most 255 characters' })
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
})

/**
 * Type inference for update account schema
 */
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>

/**
 * Update account activation status schema
 */
export const updateAccountActivationSchema = z.object({
  isActive: z.boolean({ message: 'isActive is required' }),
})

/**
 * Type inference for update account activation schema
 */
export type UpdateAccountActivationInput = z.infer<
  typeof updateAccountActivationSchema
>
