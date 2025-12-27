/**
 * Journal Entry Types
 * TypeScript type definitions for Journal Entries
 */

import type {
  JournalEntry,
  JournalEntryStatus,
  JournalEntryType,
} from '@models/JournalEntry'

/**
 * Input type for creating a journal entry line
 */
export interface CreateJournalEntryLineInput {
  accountId: string
  lineNumber: number
  debit?: number
  credit?: number
  description?: string
  memo?: string
  contactId?: string
}

/**
 * Input type for creating a new journal entry
 */
export interface CreateJournalEntryInput {
  entryNumber?: string
  entryDate: string | Date
  entryType?: JournalEntryType
  isAdjusting?: boolean
  isClosing?: boolean
  isReversing?: boolean
  reversalDate?: string | Date | null
  description?: string
  reference?: string
  memo?: string
  sourceModule?: string
  sourceId?: string
  lines: CreateJournalEntryLineInput[]
}

/**
 * Input type for updating a journal entry
 */
export interface UpdateJournalEntryInput {
  entryNumber?: string
  entryDate?: string | Date
  entryType?: JournalEntryType
  isAdjusting?: boolean
  isClosing?: boolean
  isReversing?: boolean
  reversalDate?: string | Date | null
  description?: string | null
  reference?: string | null
  memo?: string | null
  sourceModule?: string | null
  sourceId?: string | null
}

/**
 * Input type for updating a journal entry line
 */
export interface UpdateJournalEntryLineInput {
  accountId?: string
  lineNumber?: number
  debit?: number
  credit?: number
  description?: string | null
  memo?: string | null
  contactId?: string | null
}

/**
 * Filter parameters for listing journal entries
 */
export interface JournalEntryFilters {
  status?: JournalEntryStatus
  entryType?: JournalEntryType
  startDate?: string | Date
  endDate?: string | Date
  sourceModule?: string
  search?: string
  page: number
  limit: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Result type for journal entries list query
 */
export interface JournalEntryListResult {
  entries: JournalEntry[]
  total: number
}

/**
 * Input type for posting a journal entry
 */
export interface PostJournalEntryInput {
  approved?: boolean
  approvedBy?: string
}

/**
 * Input type for voiding a journal entry
 */
export interface VoidJournalEntryInput {
  reason?: string
}

/**
 * Input type for reversing a journal entry
 */
export interface ReverseJournalEntryInput {
  reversalDate: string | Date
}

/**
 * Input type for duplicating a journal entry
 */
export interface DuplicateJournalEntryInput {
  entryDate?: string | Date
  entryNumber?: string
}

/**
 * Data type for creating journal entry (internal use)
 */
export interface CreateJournalEntryData {
  entryNumber?: string | null
  entryDate: Date
  entryType: JournalEntryType
  isAdjusting: boolean
  isClosing: boolean
  isReversing: boolean
  reversalDate?: Date | null
  description?: string | null
  reference?: string | null
  memo?: string | null
  status: JournalEntryStatus
  sourceModule?: string | null
  sourceId?: string | null
  totalDebit: number
  totalCredit: number
}

/**
 * Data type for creating journal entry line (internal use)
 */
export interface CreateJournalEntryLineData {
  accountId: string
  lineNumber: number
  debit: number
  credit: number
  description?: string | null
  memo?: string | null
  contactId?: string | null
}
