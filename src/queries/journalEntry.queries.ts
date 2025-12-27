import type { Knex } from 'knex'

import type {
  CreateJournalEntryData,
  CreateJournalEntryInput,
  CreateJournalEntryLineData,
  JournalEntryListResult,
  UpdateJournalEntryInput,
} from '@/types/journalEntry.type'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { BalanceChangeType } from '@models/AccountBalanceHistory'
import { ChartOfAccount } from '@models/ChartOfAccount'
import {
  JournalEntry,
  JournalEntryStatus,
  JournalEntryType,
} from '@models/JournalEntry'
import { JournalEntryLine } from '@models/JournalEntryLine'
import { createBalanceHistory } from '@queries/accountBalanceHistory.queries'
import type { JournalEntryListInput } from '@schema/journalEntry.schema'
import { calculateOffset } from '@schema/shared.schema'
import { ApiError } from '@utils/ApiError'
import {
  formatDateToISOString,
  getCurrentDate,
  parseDateStringToUTC,
  parseToUTCDate,
} from '@utils/date'
import { withTenantSchema } from '@utils/tenantQuery'

/**
 * Generate next journal entry number
 * Format: JE-YYYY-XXX (e.g., JE-2024-001)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
export const generateEntryNumber = async (
  tenantId: string,
  schemaName: string,
  trx?: Knex.Transaction
): Promise<string> => {
  const execute = async (transaction: Knex.Transaction) => {
    const year = new Date().getFullYear()
    const prefix = `JE-${year}-`

    // Find highest entry number for this year
    const highest = await JournalEntry.query(transaction)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .where('entry_number', 'like', `${prefix}%`)
      .orderByRaw(
        'CAST(SUBSTRING(entry_number FROM LENGTH(?) + 1) AS INTEGER) DESC',
        [prefix]
      )
      .first()

    if (!highest?.entryNumber) {
      return `${prefix}001`
    }

    // Extract number part and increment
    const numberPart = highest.entryNumber.replace(prefix, '')
    const nextNumber = Number.parseInt(numberPart, 10) + 1

    return `${prefix}${String(nextNumber).padStart(3, '0')}`
  }

  // If transaction is provided, use it directly
  if (trx) {
    return execute(trx)
  }

  // Otherwise, create a new transaction
  return withTenantSchema(schemaName, execute)
}

/**
 * Map sort field to database column
 */
const mapJournalEntrySortField = (field: string): string => {
  // Use switch statement to avoid object injection
  switch (field) {
    case 'entryNumber':
      return 'entry_number'
    case 'entryDate':
      return 'entry_date'
    case 'entryType':
      return 'entry_type'
    case 'status':
      return 'status'
    case 'totalDebit':
      return 'total_debit'
    case 'totalCredit':
      return 'total_credit'
    case 'createdAt':
      return 'created_at'
    case 'updatedAt':
      return 'updated_at'
    default:
      return 'entry_date'
  }
}

/**
 * Find journal entries with pagination, sorting, search, and filtering
 */
export const findJournalEntries = async (
  tenantId: string,
  schemaName: string,
  filters: JournalEntryListInput
): Promise<JournalEntryListResult> => {
  const {
    page = 1,
    limit = 50,
    sort = 'entryDate',
    order = 'desc',
    search,
    status,
    entryType,
    startDate,
    endDate,
    sourceModule,
  } = filters

  return withTenantSchema(schemaName, async (trx) => {
    let query = JournalEntry.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)

    // Apply filters
    if (status) {
      query = query.modify('byStatus', status as JournalEntryStatus)
    }

    if (entryType) {
      query = query.modify('byType', entryType as JournalEntryType)
    }

    if (startDate && endDate) {
      query = query.modify(
        'byDateRange',
        parseDateStringToUTC(startDate),
        parseDateStringToUTC(endDate)
      )
    } else if (startDate) {
      query = query.where('entry_date', '>=', parseDateStringToUTC(startDate))
    } else if (endDate) {
      const endDateObj = parseDateStringToUTC(endDate)
      endDateObj.setHours(23, 59, 59, 999)
      query = query.where('entry_date', '<=', endDateObj)
    }

    if (sourceModule) {
      query = query.where('source_module', sourceModule)
    }

    if (search) {
      query = query.where((builder) => {
        builder
          .where('entry_number', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`)
          .orWhere('reference', 'ilike', `%${search}%`)
      })
    }

    // Get total count
    const total = await query.resultSize()

    // Apply sorting
    const sortField = mapJournalEntrySortField(sort)
    const sortOrder = order === 'desc' ? 'desc' : 'asc'

    // Apply pagination
    const offset = calculateOffset(page, limit)
    const entries = await query
      .orderBy(sortField, sortOrder)
      .limit(limit)
      .offset(offset)
      .modify('withLines')

    return { entries, total }
  })
}

/**
 * Find journal entry by ID
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param entryId - Entry ID
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
export const findJournalEntryById = async (
  tenantId: string,
  schemaName: string,
  entryId: string,
  trx?: Knex.Transaction
): Promise<JournalEntry> => {
  const execute = async (transaction: Knex.Transaction) => {
    const entry = await JournalEntry.query(transaction)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('withLines')
      .findById(entryId)

    if (!entry) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND
      )
    }

    return entry
  }

  // If transaction is provided, use it directly
  if (trx) {
    return execute(trx)
  }

  // Otherwise, create a new transaction
  return withTenantSchema(schemaName, execute)
}

/**
 * Create journal entry with lines
 */
export const createJournalEntry = async (
  tenantId: string,
  schemaName: string,
  createdBy: string,
  data: CreateJournalEntryInput
): Promise<JournalEntry> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Generate entry number if not provided
    let entryNumber = data.entryNumber
    if (!entryNumber) {
      entryNumber = await generateEntryNumber(tenantId, schemaName, trx)
    } else {
      // Check if entry number already exists
      const existing = await JournalEntry.query(trx)
        .modify('notDeleted')
        .modify('byTenant', tenantId)
        .where('entry_number', entryNumber)
        .first()

      if (existing) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          ERROR_MESSAGES.JOURNAL_ENTRY_NUMBER_EXISTS
        )
      }
    }

    // Validate all accounts exist
    for (const line of data.lines) {
      const account = await ChartOfAccount.query(trx)
        .modify('notDeleted')
        .modify('byTenant', tenantId)
        .findById(line.accountId)

      if (!account) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND
        )
      }
    }

    // Calculate totals
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + Number(line.debit ?? 0),
      0
    )
    const totalCredit = data.lines.reduce(
      (sum, line) => sum + Number(line.credit ?? 0),
      0
    )

    // Validate balance
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_BALANCED
      )
    }

    // Create journal entry
    const entryDateObj = parseDateStringToUTC(data.entryDate)
    const reversalDateObj = data.reversalDate
      ? parseDateStringToUTC(data.reversalDate)
      : null

    const entryData: CreateJournalEntryData = {
      entryNumber,
      entryDate: entryDateObj,
      entryType: data.entryType ?? JournalEntryType.STANDARD,
      isAdjusting: data.isAdjusting ?? false,
      isClosing: data.isClosing ?? false,
      isReversing: data.isReversing ?? false,
      reversalDate: reversalDateObj,
      description: data.description ?? null,
      reference: data.reference ?? null,
      memo: data.memo ?? null,
      status: JournalEntryStatus.DRAFT,
      sourceModule: data.sourceModule ?? null,
      sourceId: data.sourceId ?? null,
      totalDebit,
      totalCredit,
    }

    const insertData = {
      ...entryData,
      entryDate: entryDateObj.toISOString() as unknown as Date,
      reversalDate: reversalDateObj
        ? (reversalDateObj.toISOString() as unknown as Date)
        : null,
      tenantId,
      createdBy,
    }

    const entry = await JournalEntry.query(trx).insert(insertData)

    // Create lines
    const lineData: CreateJournalEntryLineData[] = data.lines.map(
      (line, index) => ({
        accountId: line.accountId,
        lineNumber: line.lineNumber ?? index + 1,
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        description: line.description ?? null,
        memo: line.memo ?? null,
        contactId: line.contactId ?? null,
      })
    )

    await JournalEntryLine.query(trx).insert(
      lineData.map((line) => ({
        ...line,
        journalEntryId: entry.id,
        tenantId,
        createdBy,
      }))
    )

    // Reload with lines
    const entryWithLines = await JournalEntry.query(trx)
      .modify('withLines')
      .findById(entry.id)

    if (!entryWithLines) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND
      )
    }

    return entryWithLines
  })
}

/**
 * Update journal entry (only if draft)
 */
export const updateJournalEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string,
  data: UpdateJournalEntryInput
): Promise<JournalEntry> => {
  return withTenantSchema(schemaName, async (trx) => {
    const entry = await findJournalEntryById(tenantId, schemaName, entryId, trx)

    // Cannot modify posted or voided entries
    if (entry.isPosted() || entry.isVoided()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_MODIFY_POSTED
      )
    }

    // Check entry number uniqueness if being changed
    if (data.entryNumber && data.entryNumber !== entry.entryNumber) {
      const existing = await JournalEntry.query(trx)
        .modify('notDeleted')
        .modify('byTenant', tenantId)
        .where('entry_number', data.entryNumber)
        .whereNot('id', entryId)
        .first()

      if (existing) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          ERROR_MESSAGES.JOURNAL_ENTRY_NUMBER_EXISTS
        )
      }
    }

    // Update entry
    const updateData: Partial<JournalEntry> = {}
    if (data.entryNumber !== undefined)
      updateData.entryNumber = data.entryNumber
    if (data.entryDate) {
      const entryDateObj = parseDateStringToUTC(data.entryDate)
      updateData.entryDate = entryDateObj.toISOString() as unknown as Date
    }
    if (data.entryType) updateData.entryType = data.entryType
    if (data.isAdjusting !== undefined)
      updateData.isAdjusting = data.isAdjusting
    if (data.isClosing !== undefined) updateData.isClosing = data.isClosing
    if (data.isReversing !== undefined)
      updateData.isReversing = data.isReversing
    if (data.reversalDate !== undefined) {
      const reversalDateObj = data.reversalDate
        ? parseDateStringToUTC(data.reversalDate)
        : null
      updateData.reversalDate = reversalDateObj
        ? (reversalDateObj.toISOString() as unknown as Date)
        : null
    }
    if (data.description !== undefined)
      updateData.description = data.description
    if (data.reference !== undefined) updateData.reference = data.reference
    if (data.memo !== undefined) updateData.memo = data.memo
    if (data.sourceModule !== undefined)
      updateData.sourceModule = data.sourceModule
    if (data.sourceId !== undefined) updateData.sourceId = data.sourceId

    const updated = await entry.$query(trx).patchAndFetch(updateData)

    // Reload with lines
    return findJournalEntryById(tenantId, schemaName, updated.id, trx)
  })
}

/**
 * Post journal entry (update COA balances)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param entryId - Entry ID
 * @param postedBy - User ID who posted the entry
 * @param approvedBy - Optional user ID who approved the entry
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
export const postJournalEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string,
  postedBy: string,
  approvedBy?: string,
  trx?: Knex.Transaction
): Promise<JournalEntry> => {
  const execute = async (transaction: Knex.Transaction) => {
    const entry = await findJournalEntryById(
      tenantId,
      schemaName,
      entryId,
      transaction
    )

    // Cannot post if already posted
    if (entry.isPosted()) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.JOURNAL_ENTRY_ALREADY_POSTED
      )
    }

    // Cannot post if voided
    if (entry.isVoided()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_POST_DRAFT
      )
    }

    // Validate entry
    entry.validate()

    // Update COA balances for each line
    if (entry.lines) {
      const lines: JournalEntryLine[] = entry.lines
      for (const line of lines) {
        const account = await ChartOfAccount.query(transaction)
          .modify('notDeleted')
          .modify('byTenant', tenantId)
          .findById(line.accountId)

        if (!account) {
          throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND
          )
        }

        // Update balance based on debit/credit
        const isDebit = line.debit > 0
        const amount = isDebit ? line.debit : line.credit
        const previousBalance = account.currentBalance
        const newBalance = account.updateBalance(amount, isDebit)

        // Update account balance
        await account.$query(transaction).patchAndFetch({
          currentBalance: newBalance,
        })

        // Create balance history record
        await createBalanceHistory(
          tenantId,
          schemaName,
          {
            accountId: account.id,
            journalEntryId: entry.id,
            journalEntryLineId: line.id,
            previousBalance,
            newBalance,
            changeAmount: amount,
            changeType: isDebit
              ? BalanceChangeType.DEBIT
              : BalanceChangeType.CREDIT,
            changeDate: entry.entryDate,
            description: line.description
              ? `${entry.entryNumber ?? 'JE'}: ${line.description}`
              : `Journal Entry ${entry.entryNumber ?? entry.id}`,
            sourceModule: 'journal_entries',
            sourceId: entry.id,
            createdBy: postedBy,
          },
          transaction
        )
      }
    }

    // Update entry status
    const now = getCurrentDate()
    const updateData: Partial<JournalEntry> = {
      status: JournalEntryStatus.POSTED,
      postedBy,
      postedAt: formatDateToISOString(now) as unknown as Date,
    }

    if (approvedBy) {
      updateData.approvedBy = approvedBy
      updateData.approvedAt = formatDateToISOString(now) as unknown as Date
    } else if (entry.approvedBy) {
      updateData.approvedBy = entry.approvedBy
      updateData.approvedAt = formatDateToISOString(
        entry.approvedAt
      ) as unknown as Date
    }

    const updated = await entry.$query(transaction).patchAndFetch(updateData)

    // Reload with lines
    return findJournalEntryById(tenantId, schemaName, updated.id, transaction)
  }

  // If transaction is provided, use it directly
  if (trx) {
    return execute(trx)
  }

  // Otherwise, create a new transaction
  return withTenantSchema(schemaName, execute)
}

/**
 * Void journal entry (only if draft)
 */
export const voidJournalEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string
): Promise<JournalEntry> => {
  return withTenantSchema(schemaName, async (trx) => {
    const entry = await findJournalEntryById(tenantId, schemaName, entryId, trx)

    // Cannot void if already voided
    if (entry.isVoided()) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.JOURNAL_ENTRY_ALREADY_VOIDED
      )
    }

    // Cannot void if posted (must reverse instead)
    if (entry.isPosted()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_VOID_POSTED
      )
    }

    // Update status
    const updated = await entry.$query(trx).patchAndFetch({
      status: JournalEntryStatus.VOIDED,
    })

    // Reload with lines
    return findJournalEntryById(tenantId, schemaName, updated.id, trx)
  })
}

/**
 * Delete journal entry (soft delete, only if draft)
 */
export const deleteJournalEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string
): Promise<JournalEntry> => {
  return withTenantSchema(schemaName, async (trx) => {
    const entry = await findJournalEntryById(tenantId, schemaName, entryId, trx)

    // Cannot delete if posted
    if (entry.isPosted()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_DELETE_POSTED
      )
    }

    // Soft delete using direct Knex update
    await trx('journal_entries')
      .where('id', entryId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: getCurrentDate(),
        updated_at: getCurrentDate(),
      })

    // Reload (without notDeleted modifier)
    const deleted = await JournalEntry.query(trx)
      .modify('byTenant', tenantId)
      .findById(entryId)

    if (!deleted) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND
      )
    }

    return deleted
  })
}

/**
 * Restore journal entry (un-soft delete)
 */
export const restoreJournalEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string
): Promise<JournalEntry> => {
  return withTenantSchema(schemaName, async (trx) => {
    const entry = await JournalEntry.query(trx)
      .modify('deleted')
      .modify('byTenant', tenantId)
      .findById(entryId)

    if (!entry) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND_OR_NOT_DELETED
      )
    }

    // Restore
    await trx('journal_entries')
      .where('id', entryId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: null,
        updated_at: getCurrentDate(),
      })

    // Reload
    const restored = await JournalEntry.query(trx)
      .modify('byTenant', tenantId)
      .findById(entryId)

    if (!restored) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND
      )
    }

    return restored
  })
}

/**
 * Reverse a posted journal entry
 * Creates a new reversing entry with debits/credits swapped and updates COA balances
 */
export const reverseJournalEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string,
  reversalDate: Date,
  createdBy: string
): Promise<JournalEntry> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Get the original entry
    const originalEntry = await findJournalEntryById(
      tenantId,
      schemaName,
      entryId,
      trx
    )

    // Cannot reverse if voided (check this first since voided entries are also not posted)
    if (originalEntry.isVoided()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_REVERSE_VOIDED
      )
    }

    // Cannot reverse if not posted (draft entries)
    if (!originalEntry.isPosted()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_REVERSE_DRAFT
      )
    }

    // Check if already reversed (has a reversing entry)
    const existingReversal = await JournalEntry.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .where('source_module', 'journal_entries')
      .where('source_id', entryId)
      .where('is_reversing', true)
      .first()

    if (existingReversal) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.JOURNAL_ENTRY_ALREADY_REVERSED
      )
    }

    // Use originalEntry which already has lines loaded (from findJournalEntryById with withLines modifier)
    // No need to reload - originalEntry was already fetched with proper security filters
    if (!originalEntry.lines || originalEntry.lines.length === 0) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND
      )
    }

    // Generate reversing entry number
    const reversingEntryNumber = await generateEntryNumber(
      tenantId,
      schemaName,
      trx
    )

    // Create reversing entry with swapped debits/credits
    const reversingLines = originalEntry.lines.map((line) => ({
      accountId: line.accountId,
      lineNumber: line.lineNumber,
      // Swap debit and credit
      debit: Number(line.credit || 0),
      credit: Number(line.debit || 0),
      description: line.description
        ? `Reversal: ${line.description}`
        : `Reversal of entry ${originalEntry.entryNumber ?? entryId}`,
      memo: line.memo ? `Reversal: ${line.memo}` : null,
      contactId: line.contactId ?? null,
    }))

    // Calculate totals (swapped)
    const totalDebit = reversingLines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0
    )
    const totalCredit = reversingLines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0
    )

    // Create reversing entry
    const reversingEntryData: CreateJournalEntryData = {
      entryNumber: reversingEntryNumber,
      entryDate: reversalDate,
      entryType: JournalEntryType.REVERSING,
      isAdjusting: false,
      isClosing: false,
      isReversing: true,
      reversalDate: reversalDate,
      description: `Reversal of journal entry ${originalEntry.entryNumber ?? entryId}`,
      reference: originalEntry.reference
        ? `Reversal: ${originalEntry.reference}`
        : null,
      status: JournalEntryStatus.DRAFT, // Start as draft, will be posted
      sourceModule: 'journal_entries',
      sourceId: entryId,
      totalDebit,
      totalCredit,
    }

    const insertData = {
      ...reversingEntryData,
      entryDate: formatDateToISOString(reversalDate) as unknown as Date,
      reversalDate: formatDateToISOString(reversalDate) as unknown as Date,
      tenantId,
      createdBy,
    }

    const reversingEntry = await JournalEntry.query(trx).insert(insertData)

    // Create reversing lines
    await JournalEntryLine.query(trx).insert(
      reversingLines.map((line) => ({
        ...line,
        journalEntryId: reversingEntry.id,
        tenantId,
        createdBy,
      }))
    )

    // Post the reversing entry (this will reverse the COA balances)
    const postedReversal = await postJournalEntry(
      tenantId,
      schemaName,
      reversingEntry.id,
      createdBy,
      undefined,
      trx
    )

    // Mark original entry as reversed (set reversalDate to indicate it has been reversed)
    // Note: isReversing should remain false on the original entry - it only applies to the reversing entry itself
    await originalEntry.$query(trx).patchAndFetch({
      reversalDate: formatDateToISOString(reversalDate) as unknown as Date,
    })

    // Reload reversing entry with lines
    return findJournalEntryById(tenantId, schemaName, postedReversal.id, trx)
  })
}

/**
 * Duplicate journal entry
 * Creates a new journal entry with copied data from an existing entry
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param entryId - Entry ID to duplicate
 * @param createdBy - User ID creating the duplicate
 * @param duplicateData - Optional data to override (entryDate, entryNumber)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
export const duplicateJournalEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string,
  createdBy: string,
  duplicateData?: { entryDate?: string | Date; entryNumber?: string },
  trx?: Knex.Transaction
): Promise<JournalEntry> => {
  const execute = async (transaction: Knex.Transaction) => {
    // Get original entry with lines
    const original = await findJournalEntryById(
      tenantId,
      schemaName,
      entryId,
      transaction
    )

    if (!original.lines || original.lines.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.JOURNAL_ENTRY_INSUFFICIENT_LINES
      )
    }

    // Determine entry date (use provided date, or original date, or today)
    const entryDate = duplicateData?.entryDate
      ? typeof duplicateData.entryDate === 'string'
        ? parseDateStringToUTC(duplicateData.entryDate)
        : parseToUTCDate(duplicateData.entryDate)
      : original.entryDate

    // Generate entry number if not provided
    let entryNumber = duplicateData?.entryNumber
    if (!entryNumber) {
      entryNumber = await generateEntryNumber(tenantId, schemaName, transaction)
    } else {
      // Check if entry number already exists
      const existing = await JournalEntry.query(transaction)
        .modify('notDeleted')
        .modify('byTenant', tenantId)
        .where('entry_number', entryNumber)
        .first()

      if (existing) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          ERROR_MESSAGES.JOURNAL_ENTRY_NUMBER_EXISTS
        )
      }
    }

    // Create new entry with copied data
    const entryData: CreateJournalEntryData = {
      entryNumber,
      entryDate,
      entryType: original.entryType,
      isAdjusting: original.isAdjusting,
      isClosing: original.isClosing,
      isReversing: false, // Duplicated entries are not reversing entries
      reversalDate: null, // Reset reversal date
      description: original.description ?? null,
      reference: original.reference ?? null,
      memo: original.memo ?? null,
      status: JournalEntryStatus.DRAFT, // Always start as draft
      sourceModule: 'journal_entries', // Mark as duplicated from journal entry
      sourceId: original.id, // Reference to original entry
      totalDebit: Number(original.totalDebit ?? 0),
      totalCredit: Number(original.totalCredit ?? 0),
    }

    const insertData = {
      ...entryData,
      entryDate: entryDate.toISOString() as unknown as Date,
      tenantId,
      createdBy,
    }

    const newEntry = await JournalEntry.query(transaction).insert(insertData)

    // Create lines with copied data
    const lineData: CreateJournalEntryLineData[] = original.lines.map(
      (line) => ({
        accountId: line.accountId,
        lineNumber: line.lineNumber,
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        description: line.description ?? null,
        memo: line.memo ?? null,
        contactId: line.contactId ?? null,
      })
    )

    await JournalEntryLine.query(transaction).insert(
      lineData.map((line) => ({
        ...line,
        journalEntryId: newEntry.id,
        tenantId,
        createdBy,
      }))
    )

    // Reload with lines
    return findJournalEntryById(tenantId, schemaName, newEntry.id, transaction)
  }

  // If transaction is provided, use it directly
  if (trx) {
    return execute(trx)
  }

  // Otherwise, create a new transaction
  return withTenantSchema(schemaName, execute)
}
