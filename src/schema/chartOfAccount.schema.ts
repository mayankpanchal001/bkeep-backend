/**
 * Chart of Account Schema
 * Zod validation schemas for chart of account-related requests
 */

import { z } from 'zod'

import {
  paginationSortingSearchSchema,
  statusFilterSchema,
} from '@schema/shared.schema'

/**
 * Valid sort fields for chart of accounts
 */
export const CHART_OF_ACCOUNT_SORT_FIELDS = [
  'accountNumber',
  'accountName',
  'accountType',
  'currentBalance',
  'openingBalance',
  'isActive',
  'createdAt',
  'updatedAt',
] as const

/**
 * Chart of account list query schema
 * Includes pagination, sorting, search, and filtering
 */
export const chartOfAccountListSchema = paginationSortingSearchSchema
  .merge(statusFilterSchema)
  .extend({
    sort: z
      .enum(CHART_OF_ACCOUNT_SORT_FIELDS)
      .optional()
      .default('accountName'),
    accountType: z
      .enum(['asset', 'liability', 'equity', 'revenue', 'expense'])
      .optional(),
    accountSubtype: z.string().max(100).optional(),
    parentAccountId: z
      .string()
      .uuid({ message: 'Invalid parent account ID format' })
      .nullable()
      .optional(),
  })

/**
 * Type inference for chart of account list schema
 */
export type ChartOfAccountListInput = z.infer<typeof chartOfAccountListSchema>

/**
 * Chart of account ID schema
 * Validates UUID format for account ID
 */
export const chartOfAccountIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid chart of account ID format' }),
})

/**
 * Type inference for chart of account ID schema
 */
export type ChartOfAccountIdInput = z.infer<typeof chartOfAccountIdSchema>

/**
 * Create chart of account schema
 */
export const createChartOfAccountSchema = z.object({
  accountNumber: z
    .string()
    .max(50, { message: 'Account number must be at most 50 characters' })
    .optional(),
  accountName: z
    .string()
    .min(1, { message: 'Account name is required' })
    .max(255, { message: 'Account name must be at most 255 characters' }),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense'], {
    message: 'Invalid account type',
  }),
  accountSubtype: z
    .string()
    .max(100, { message: 'Account subtype must be at most 100 characters' })
    .optional(),
  accountDetailType: z
    .string()
    .max(100, {
      message: 'Account detail type must be at most 100 characters',
    })
    .optional(),
  parentAccountId: z
    .string()
    .uuid({ message: 'Invalid parent account ID format' })
    .optional(),
  openingBalance: z
    .number({ message: 'Opening balance must be a number' })
    .optional()
    .default(0),
  currencyCode: z
    .string()
    .length(3, { message: 'Currency code must be 3 characters (ISO 4217)' })
    .optional()
    .default('CAD'),
  description: z.string().optional(),
  trackTax: z.boolean().optional().default(false),
  defaultTaxId: z
    .string()
    .uuid({ message: 'Invalid tax ID format' })
    .optional(),
  bankAccountNumber: z
    .string()
    .max(100, { message: 'Bank account number must be at most 100 characters' })
    .optional(),
  bankRoutingNumber: z
    .string()
    .max(50, { message: 'Bank routing number must be at most 50 characters' })
    .optional(),
})

/**
 * Type inference for create chart of account schema
 */
export type CreateChartOfAccountInput = z.infer<
  typeof createChartOfAccountSchema
>

/**
 * Update chart of account schema
 */
export const updateChartOfAccountSchema = z.object({
  accountNumber: z
    .string()
    .max(50, { message: 'Account number must be at most 50 characters' })
    .optional(),
  accountName: z
    .string()
    .min(1, { message: 'Account name is required' })
    .max(255, { message: 'Account name must be at most 255 characters' })
    .optional(),
  accountSubtype: z
    .string()
    .max(100, { message: 'Account subtype must be at most 100 characters' })
    .optional(),
  accountDetailType: z
    .string()
    .max(100, {
      message: 'Account detail type must be at most 100 characters',
    })
    .optional(),
  parentAccountId: z
    .string()
    .uuid({ message: 'Invalid parent account ID format' })
    .nullable()
    .optional(),
  currencyCode: z
    .string()
    .length(3, { message: 'Currency code must be 3 characters (ISO 4217)' })
    .optional(),
  description: z.string().nullable().optional(),
  trackTax: z.boolean().optional(),
  defaultTaxId: z
    .string()
    .uuid({ message: 'Invalid tax ID format' })
    .nullable()
    .optional(),
  bankAccountNumber: z
    .string()
    .max(100, { message: 'Bank account number must be at most 100 characters' })
    .nullable()
    .optional(),
  bankRoutingNumber: z
    .string()
    .max(50, { message: 'Bank routing number must be at most 50 characters' })
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
})

/**
 * Type inference for update chart of account schema
 */
export type UpdateChartOfAccountInput = z.infer<
  typeof updateChartOfAccountSchema
>
