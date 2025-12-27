import type { Knex } from 'knex'

import {
  AccountBalanceHistory,
  BalanceChangeType,
} from '@models/AccountBalanceHistory'
import { formatDateToISOString, getCurrentDate } from '@utils/date'
import { withTenantSchema } from '@utils/tenantQuery'

export interface CreateBalanceHistoryData {
  accountId: string
  journalEntryId?: string | null
  journalEntryLineId?: string | null
  previousBalance: number
  newBalance: number
  changeAmount: number
  changeType: BalanceChangeType
  changeDate?: Date
  description?: string | null
  sourceModule?: string | null
  sourceId?: string | null
  createdBy: string
}

export interface BalanceHistoryFilters {
  accountId?: string
  journalEntryId?: string
  startDate?: Date
  endDate?: Date
  changeType?: BalanceChangeType
  page: number
  limit: number
}

export interface BalanceHistoryListResult {
  history: AccountBalanceHistory[]
  total: number
}

/**
 * Create a balance history record
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param data - Balance history data
 * @param trx - Optional transaction to use
 * @returns Created balance history record
 */
export const createBalanceHistory = async (
  tenantId: string,
  schemaName: string,
  data: CreateBalanceHistoryData,
  trx?: Knex.Transaction
): Promise<AccountBalanceHistory> => {
  const execute = async (transaction: Knex.Transaction) => {
    const changeDate = data.changeDate ?? getCurrentDate()
    const insertData = {
      ...data,
      tenantId,
      previousBalance: Number(data.previousBalance),
      newBalance: Number(data.newBalance),
      changeAmount: Number(data.changeAmount),
      changeDate: formatDateToISOString(changeDate) as unknown as Date,
    }

    return AccountBalanceHistory.query(transaction).insert(insertData)
  }

  if (trx) {
    return execute(trx)
  }

  return withTenantSchema(schemaName, execute)
}

/**
 * Find balance history records with filters
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param filters - Filter criteria
 * @returns List of balance history records with total count
 */
export const findBalanceHistory = async (
  tenantId: string,
  schemaName: string,
  filters: BalanceHistoryFilters
): Promise<BalanceHistoryListResult> => {
  return withTenantSchema(schemaName, async (trx) => {
    let query = AccountBalanceHistory.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)

    // Apply filters
    if (filters.accountId) {
      query = query.modify('byAccount', filters.accountId)
    }

    if (filters.journalEntryId) {
      query = query.modify('byJournalEntry', filters.journalEntryId)
    }

    if (filters.startDate && filters.endDate) {
      query = query.modify('byDateRange', filters.startDate, filters.endDate)
    }

    if (filters.changeType) {
      query = query.modify('byChangeType', filters.changeType)
    }

    // Get total count
    const total = await query.resultSize()

    // Apply pagination and sorting
    const offset = (filters.page - 1) * filters.limit
    const history = await query
      .modify('recentFirst')
      .limit(filters.limit)
      .offset(offset)

    return { history, total }
  })
}

/**
 * Find balance history by account ID
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param accountId - Account ID
 * @param limit - Optional limit (default: 100)
 * @returns List of balance history records for the account
 */
export const findBalanceHistoryByAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  limit: number = 100
): Promise<AccountBalanceHistory[]> => {
  return withTenantSchema(schemaName, async (trx) => {
    return AccountBalanceHistory.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('byAccount', accountId)
      .modify('recentFirst')
      .limit(limit)
  })
}

/**
 * Find balance history by journal entry ID
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param journalEntryId - Journal entry ID
 * @returns List of balance history records for the journal entry
 */
export const findBalanceHistoryByJournalEntry = async (
  tenantId: string,
  schemaName: string,
  journalEntryId: string
): Promise<AccountBalanceHistory[]> => {
  return withTenantSchema(schemaName, async (trx) => {
    return AccountBalanceHistory.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('byJournalEntry', journalEntryId)
      .modify('recentFirst')
  })
}

/**
 * Get account balance at a specific point in time
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param accountId - Account ID
 * @param asOfDate - Date to get balance as of
 * @returns Balance at the specified date, or null if no history before that date
 */
export const getAccountBalanceAsOf = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  asOfDate: Date
): Promise<number | null> => {
  return withTenantSchema(schemaName, async (trx) => {
    const history = await AccountBalanceHistory.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('byAccount', accountId)
      .where('change_date', '<=', asOfDate)
      .modify('recentFirst')
      .first()

    if (!history) {
      return null
    }

    return history.newBalance
  })
}
