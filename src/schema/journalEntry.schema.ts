/**
 * Journal Entry Schema
 * Zod validation schemas for journal entry-related requests
 */

import { z } from 'zod'

import { paginationSortingSearchSchema } from '@schema/shared.schema'

/**
 * Valid sort fields for journal entries
 */
export const JOURNAL_ENTRY_SORT_FIELDS = [
  'entryNumber',
  'entryDate',
  'entryType',
  'status',
  'totalDebit',
  'totalCredit',
  'createdAt',
  'updatedAt',
] as const

/**
 * Journal entry line schema
 */
export const journalEntryLineSchema = z
  .object({
    accountId: z.string().uuid({ message: 'Invalid account ID format' }),
    lineNumber: z
      .number({ message: 'Line number must be a number' })
      .int({ message: 'Line number must be an integer' })
      .min(1, { message: 'Line number must be at least 1' }),
    debit: z
      .number({ message: 'Debit must be a number' })
      .nonnegative({ message: 'Debit must be non-negative' })
      .default(0),
    credit: z
      .number({ message: 'Credit must be a number' })
      .nonnegative({ message: 'Credit must be non-negative' })
      .default(0),
    description: z.string().optional(),
    memo: z.string().optional(),
    contactId: z
      .string()
      .uuid({ message: 'Invalid contact ID format' })
      .optional(),
  })
  .refine(
    (data) => {
      // Must have either debit or credit, but not both
      const hasDebit = data.debit > 0
      const hasCredit = data.credit > 0
      return hasDebit !== hasCredit
    },
    {
      message: 'Line must have either debit or credit, but not both',
    }
  )

/**
 * Journal entry list query schema
 */
export const journalEntryListSchema = paginationSortingSearchSchema.extend({
  sort: z.enum(JOURNAL_ENTRY_SORT_FIELDS).optional().default('entryDate'),
  status: z.enum(['draft', 'posted', 'voided']).optional(),
  entryType: z
    .enum(['standard', 'adjusting', 'closing', 'reversing'])
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid start date format. Expected YYYY-MM-DD',
    })
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid end date format. Expected YYYY-MM-DD',
    })
    .optional(),
  sourceModule: z.string().max(100).optional(),
})

/**
 * Type inference for journal entry list schema
 */
export type JournalEntryListInput = z.infer<typeof journalEntryListSchema>

/**
 * Journal entry ID schema
 * Validates UUID format for journal entry ID
 */
export const journalEntryIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid journal entry ID format' }),
})

/**
 * Create journal entry schema
 */
export const createJournalEntrySchema = z
  .object({
    entryNumber: z
      .string()
      .max(100, { message: 'Entry number must be at most 100 characters' })
      .optional(),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid entry date format. Expected YYYY-MM-DD',
    }),
    entryType: z
      .enum(['standard', 'adjusting', 'closing', 'reversing'], {
        message: 'Invalid entry type',
      })
      .optional()
      .default('standard'),
    isAdjusting: z.boolean().optional().default(false),
    isClosing: z.boolean().optional().default(false),
    isReversing: z.boolean().optional().default(false),
    reversalDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Invalid reversal date format. Expected YYYY-MM-DD',
      })
      .nullable()
      .optional(),
    description: z.string().optional(),
    reference: z
      .string()
      .max(255, { message: 'Reference must be at most 255 characters' })
      .optional(),
    memo: z.string().optional(),
    sourceModule: z.string().max(100).optional(),
    sourceId: z
      .string()
      .uuid({ message: 'Invalid source ID format' })
      .optional(),
    lines: z
      .array(journalEntryLineSchema)
      .min(2, { message: 'Journal entry must have at least 2 lines' }),
  })
  .refine(
    (data) => {
      // Validate that debits equal credits
      const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0)
      const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0)
      return Math.abs(totalDebit - totalCredit) < 0.01
    },
    {
      message: 'Total debits must equal total credits',
      path: ['lines'],
    }
  )

/**
 * Update journal entry schema
 */
export const updateJournalEntrySchema = z.object({
  entryNumber: z
    .string()
    .max(100, { message: 'Entry number must be at most 100 characters' })
    .optional(),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid entry date format. Expected YYYY-MM-DD',
    })
    .optional(),
  entryType: z
    .enum(['standard', 'adjusting', 'closing', 'reversing'], {
      message: 'Invalid entry type',
    })
    .optional(),
  isAdjusting: z.boolean().optional(),
  isClosing: z.boolean().optional(),
  isReversing: z.boolean().optional(),
  reversalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid reversal date format. Expected YYYY-MM-DD',
    })
    .nullable()
    .optional(),
  description: z.string().nullable().optional(),
  reference: z
    .string()
    .max(255, { message: 'Reference must be at most 255 characters' })
    .nullable()
    .optional(),
  memo: z.string().nullable().optional(),
  sourceModule: z.string().max(100).nullable().optional(),
  sourceId: z
    .string()
    .uuid({ message: 'Invalid source ID format' })
    .nullable()
    .optional(),
})

/**
 * Post journal entry schema
 */
export const postJournalEntrySchema = z
  .object({
    approved: z.boolean().optional().default(false),
    approvedBy: z
      .string()
      .uuid({ message: 'Invalid approver ID format' })
      .optional(),
  })
  .optional()

/**
 * Void journal entry schema
 */
export const voidJournalEntrySchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .optional()

/**
 * Reverse journal entry schema
 */
export const reverseJournalEntrySchema = z.object({
  reversalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid reversal date format. Expected YYYY-MM-DD',
    })
    .or(z.date()),
})

/**
 * Duplicate journal entry schema
 */
export const duplicateJournalEntrySchema = z.object({
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid entry date format. Expected YYYY-MM-DD',
    })
    .optional(),
  entryNumber: z
    .string()
    .max(100, { message: 'Entry number must be at most 100 characters' })
    .optional(),
})

/**
 * Type exports
 */
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>
export type PostJournalEntryInput = z.infer<typeof postJournalEntrySchema>
export type VoidJournalEntryInput = z.infer<typeof voidJournalEntrySchema>
export type ReverseJournalEntryInput = z.infer<typeof reverseJournalEntrySchema>
export type DuplicateJournalEntryInput = z.infer<
  typeof duplicateJournalEntrySchema
>
export type JournalEntryIdInput = z.infer<typeof journalEntryIdSchema>
