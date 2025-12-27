import type { RequestHandler } from 'express'
import { Response } from 'express'

import type { DuplicateJournalEntryInput } from '@/types/journalEntry.type'
import type { JwtUser } from '@/types/jwt.type'
import { HTTP_STATUS } from '@constants/http'
import { SUCCESS_MESSAGES } from '@constants/success'
import {
  getTenantContext,
  type TenantContext,
  type TenantRequest,
} from '@middlewares/tenantContext.middleware'
import {
  createJournalEntry,
  deleteJournalEntry,
  duplicateJournalEntry,
  findJournalEntries,
  findJournalEntryById,
  postJournalEntry,
  restoreJournalEntry,
  reverseJournalEntry,
  updateJournalEntry,
  voidJournalEntry,
} from '@queries/journalEntry.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'
import {
  formatDateToString,
  parseDateStringToUTC,
  parseToUTCDate,
} from '@utils/date'

/**
 * Get all journal entries controller
 * Retrieves journal entries with pagination, sorting, search, and filtering
 */
export const getAllJournalEntries: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated query parameters
    const filters = (
      req as TenantRequest & {
        validatedData: Parameters<typeof findJournalEntries>[2]
      }
    ).validatedData

    // Fetch entries
    const { entries, total } = await findJournalEntries(
      tenantContext.tenantId,
      tenantContext.schemaName,
      filters
    )

    // Transform entries to response format (exclude internal fields)
    const entriesData = entries.map((entry) => ({
      id: entry.id,
      entryNumber: entry.entryNumber ?? null,
      entryDate: formatDateToString(entry.entryDate),
      entryType: entry.entryType,
      isAdjusting: entry.isAdjusting,
      isClosing: entry.isClosing,
      isReversing: entry.isReversing,
      description: entry.description ?? null,
      reference: entry.reference ?? null,
      status: entry.status,
      sourceModule: entry.sourceModule ?? null,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      postedAt: entry.postedAt ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lines:
        entry.lines?.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? null,
          memo: line.memo ?? null,
        })) ?? [],
    }))

    // Get pagination metadata
    const pagination = getPaginationMetadata(filters.page, filters.limit, total)

    // Prepare response data
    const responseData = {
      items: entriesData,
      pagination,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.JOURNAL_ENTRIES_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Get journal entry by ID controller
 */
export const getJournalEntryById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch entry
    const entry = await findJournalEntryById(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform entry to response format
    const responseData = {
      id: entry.id,
      entryNumber: entry.entryNumber ?? null,
      entryDate: formatDateToString(entry.entryDate),
      entryType: entry.entryType,
      isAdjusting: entry.isAdjusting,
      isClosing: entry.isClosing,
      isReversing: entry.isReversing,
      reversalDate: formatDateToString(entry.reversalDate),
      description: entry.description ?? null,
      reference: entry.reference ?? null,
      memo: entry.memo ?? null,
      status: entry.status,
      sourceModule: entry.sourceModule ?? null,
      sourceId: entry.sourceId ?? null,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      approvedBy: entry.approvedBy ?? null,
      approvedAt: entry.approvedAt ?? null,
      postedBy: entry.postedBy ?? null,
      postedAt: entry.postedAt ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lines:
        entry.lines?.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          account: line.account
            ? {
                id: line.account.id,
                accountNumber: line.account.accountNumber ?? null,
                accountName: line.account.accountName,
                accountType: line.account.accountType,
              }
            : null,
          lineNumber: line.lineNumber,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? null,
          memo: line.memo ?? null,
        })) ?? [],
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Create journal entry controller
 */
export const createJournalEntryController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated body
    const entryData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof createJournalEntry>[3]
      }
    ).validatedData

    // Create entry
    const entry = await createJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      user.id,
      entryData
    )

    // Transform entry to response format
    const responseData = {
      id: entry.id,
      entryNumber: entry.entryNumber ?? null,
      entryDate: formatDateToString(entry.entryDate),
      entryType: entry.entryType,
      status: entry.status,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      memo: entry.memo ?? null,
      createdAt: entry.createdAt,
      lines:
        entry.lines?.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          debit: line.debit,
          credit: line.credit,
        })) ?? [],
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_CREATED,
          responseData
        )
      )
  }
)

/**
 * Update journal entry controller
 */
export const updateJournalEntryController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const updateData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof updateJournalEntry>[3]
      }
    ).validatedData

    // Update entry
    const updatedEntry = await updateJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      updateData
    )

    // Transform entry to response format
    const responseData = {
      id: updatedEntry.id,
      entryNumber: updatedEntry.entryNumber ?? null,
      entryDate: formatDateToString(updatedEntry.entryDate),
      entryType: updatedEntry.entryType,
      status: updatedEntry.status,
      updatedAt: updatedEntry.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_UPDATED,
          responseData
        )
      )
  }
)

/**
 * Post journal entry controller
 * Posts a draft journal entry and updates COA balances
 */
export const postJournalEntryController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const postData = (
      req as TenantRequest & {
        body?: { approved?: boolean; approvedBy?: string }
      }
    ).body

    // Post entry
    const postedEntry = await postJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      user.id,
      postData?.approvedBy
    )

    // Transform entry to response format
    const responseData = {
      id: postedEntry.id,
      entryNumber: postedEntry.entryNumber ?? null,
      status: postedEntry.status,
      postedBy: postedEntry.postedBy ?? null,
      postedAt: postedEntry.postedAt ?? null,
      totalDebit: postedEntry.totalDebit,
      totalCredit: postedEntry.totalCredit,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_POSTED,
          responseData
        )
      )
  }
)

/**
 * Void journal entry controller
 */
export const voidJournalEntryController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Void entry
    const voidedEntry = await voidJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform entry to response format
    const responseData = {
      id: voidedEntry.id,
      entryNumber: voidedEntry.entryNumber ?? null,
      status: voidedEntry.status,
      updatedAt: voidedEntry.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_VOIDED,
          responseData
        )
      )
  }
)

/**
 * Delete journal entry controller
 * Soft deletes a journal entry (only if draft)
 */
export const deleteJournalEntryById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Delete entry
    const deletedEntry = await deleteJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform entry to response format
    const responseData = {
      id: deletedEntry.id,
      entryNumber: deletedEntry.entryNumber ?? null,
      deletedAt: deletedEntry.deletedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_DELETED,
          responseData
        )
      )
  }
)

/**
 * Restore journal entry controller
 * Restores a soft-deleted journal entry
 */
export const restoreJournalEntryById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Restore entry
    const restoredEntry = await restoreJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform entry to response format
    const responseData = {
      id: restoredEntry.id,
      entryNumber: restoredEntry.entryNumber ?? null,
      status: restoredEntry.status,
      createdAt: restoredEntry.createdAt,
      updatedAt: restoredEntry.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_RESTORED,
          responseData
        )
      )
  }
)

/**
 * Reverse journal entry controller
 * Creates a reversing entry for a posted journal entry
 */
export const reverseJournalEntryController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const reverseData = (
      req as TenantRequest & {
        validatedData: { reversalDate: string | Date }
      }
    ).validatedData

    // Parse reversal date - if string, use date string parser; if Date, use UTC parser
    const reversalDate =
      typeof reverseData.reversalDate === 'string'
        ? parseDateStringToUTC(reverseData.reversalDate)
        : parseToUTCDate(reverseData.reversalDate)

    // Reverse entry
    const reversedEntry = await reverseJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      reversalDate,
      user.id
    )

    // Transform entry to response format
    const responseData = {
      id: reversedEntry.id,
      entryNumber: reversedEntry.entryNumber ?? null,
      entryDate: formatDateToString(reversedEntry.entryDate),
      entryType: reversedEntry.entryType,
      isReversing: reversedEntry.isReversing,
      reversalDate: formatDateToString(reversedEntry.reversalDate),
      description: reversedEntry.description ?? null,
      reference: reversedEntry.reference ?? null,
      status: reversedEntry.status,
      sourceModule: reversedEntry.sourceModule ?? null,
      sourceId: reversedEntry.sourceId ?? null,
      totalDebit: reversedEntry.totalDebit,
      totalCredit: reversedEntry.totalCredit,
      postedAt: reversedEntry.postedAt ?? null,
      createdAt: reversedEntry.createdAt,
      lines:
        reversedEntry.lines?.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? null,
        })) ?? [],
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_REVERSED,
          responseData
        )
      )
  }
)

/**
 * Duplicate journal entry controller
 * Creates a new journal entry by duplicating an existing entry
 */
export const duplicateJournalEntryController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const duplicateData = (
      req as TenantRequest & {
        validatedData?: DuplicateJournalEntryInput
      }
    ).validatedData

    // Duplicate entry
    const duplicatedEntry = await duplicateJournalEntry(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      user.id,
      duplicateData
    )

    // Transform entry to response format
    const responseData = {
      id: duplicatedEntry.id,
      entryNumber: duplicatedEntry.entryNumber ?? null,
      entryDate: formatDateToString(duplicatedEntry.entryDate),
      entryType: duplicatedEntry.entryType,
      isAdjusting: duplicatedEntry.isAdjusting,
      isClosing: duplicatedEntry.isClosing,
      description: duplicatedEntry.description ?? null,
      reference: duplicatedEntry.reference ?? null,
      memo: duplicatedEntry.memo ?? null,
      status: duplicatedEntry.status,
      sourceModule: duplicatedEntry.sourceModule ?? null,
      sourceId: duplicatedEntry.sourceId ?? null,
      totalDebit: duplicatedEntry.totalDebit,
      totalCredit: duplicatedEntry.totalCredit,
      createdAt: duplicatedEntry.createdAt,
      lines:
        duplicatedEntry.lines?.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? null,
          memo: line.memo ?? null,
        })) ?? [],
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.JOURNAL_ENTRY_DUPLICATED,
          responseData
        )
      )
  }
)
