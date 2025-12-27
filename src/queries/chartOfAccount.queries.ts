import type { Knex } from 'knex'

import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { AccountType, ChartOfAccount } from '@models/ChartOfAccount'
import type { ChartOfAccountListInput } from '@schema/chartOfAccount.schema'
import { calculateOffset } from '@schema/shared.schema'
import { ApiError } from '@utils/ApiError'
import { getCurrentDate } from '@utils/date'
import { withTenantSchema } from '@utils/tenantQuery'

/**
 * Generate next account number based on account type
 * Asset: 1000-1999
 * Liability: 2000-2999
 * Equity: 3000-3999
 * Revenue: 4000-4999
 * Expense: 5000-5999
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param accountType - Account type
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
export const generateAccountNumber = async (
  tenantId: string,
  schemaName: string,
  accountType: AccountType,
  trx?: Knex.Transaction
): Promise<string> => {
  const execute = async (transaction: Knex.Transaction) => {
    const ranges: Record<AccountType, { min: number; max: number }> = {
      [AccountType.ASSET]: { min: 1000, max: 1999 },
      [AccountType.LIABILITY]: { min: 2000, max: 2999 },
      [AccountType.EQUITY]: { min: 3000, max: 3999 },
      [AccountType.REVENUE]: { min: 4000, max: 4999 },
      [AccountType.EXPENSE]: { min: 5000, max: 5999 },
    }

    // eslint-disable-next-line security/detect-object-injection
    const range = ranges[accountType]

    // Find highest account number in range
    const highest = await ChartOfAccount.query(transaction)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .where('account_type', accountType)
      .whereRaw('CAST(account_number AS INTEGER) >= ?', [range.min])
      .whereRaw('CAST(account_number AS INTEGER) <= ?', [range.max])
      .orderByRaw('CAST(account_number AS INTEGER) DESC')
      .first()

    if (!highest?.accountNumber) {
      return String(range.min)
    }

    const nextNumber = Number.parseInt(highest.accountNumber, 10) + 1
    if (nextNumber > range.max) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Account number range ${range.min}-${range.max} is full for ${accountType} accounts`
      )
    }

    return String(nextNumber)
  }

  // If transaction is provided, use it directly
  if (trx) {
    return execute(trx)
  }

  // Otherwise, create a new transaction
  return withTenantSchema(schemaName, execute)
}

/**
 * Interface for chart of account query result with pagination
 */
export interface ChartOfAccountQueryResult {
  accounts: ChartOfAccount[]
  total: number
}

/**
 * Map sort field to database column
 */
const mapChartOfAccountSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    accountNumber: 'account_number',
    accountName: 'account_name',
    accountType: 'account_type',
    currentBalance: 'current_balance',
    openingBalance: 'opening_balance',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }

  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'account_name'
}

/**
 * Find chart of accounts with pagination, sorting, search, and filtering
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing accounts array and total count
 */
export const findChartOfAccounts = async (
  tenantId: string,
  schemaName: string,
  filters: ChartOfAccountListInput
): Promise<ChartOfAccountQueryResult> => {
  const {
    page,
    limit,
    sort = 'accountName',
    order = 'asc',
    search,
    isActive,
    accountType,
    accountSubtype,
    parentAccountId,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapChartOfAccountSortField(sort)

  return withTenantSchema(schemaName, async (trx) => {
    // Build base query
    let query = ChartOfAccount.query(trx).modify('notDeleted')

    // Filter by tenant
    query = query.modify('byTenant', tenantId)

    // Apply active filter if provided
    if (isActive !== undefined) {
      if (isActive) {
        query = query.modify('active')
      } else {
        query = query.where('is_active', false)
      }
    }

    // Apply account type filter if provided
    if (accountType) {
      query = query.modify('byType', accountType)
    }

    // Apply account subtype filter if provided
    if (accountSubtype) {
      query = query.modify('bySubtype', accountSubtype)
    }

    // Apply parent account filter if provided
    if (parentAccountId !== undefined) {
      if (parentAccountId === null) {
        query = query.modify('topLevel')
      } else {
        query = query.where('parent_account_id', parentAccountId)
      }
    }

    // Apply search if provided
    if (search) {
      query = query.where((builder) => {
        builder
          .where('account_name', 'ilike', `%${search}%`)
          .orWhere('account_number', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`)
      })
    }

    // Get total count before pagination
    const total = await query.resultSize()

    // Apply pagination and sorting
    const accounts = await query
      .orderBy(sortColumn, order)
      .limit(limit)
      .offset(offset)

    return { accounts, total }
  })
}

/**
 * Find chart of account by ID
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID (UUID)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Chart of account object
 * @throws ApiError if account not found
 */
export const findChartOfAccountById = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  trx?: Knex.Transaction
): Promise<ChartOfAccount> => {
  const execute = async (transaction: Knex.Transaction) => {
    const account = await ChartOfAccount.query(transaction)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND
      )
    }

    return account
  }

  // If transaction is provided, use it directly
  if (trx) {
    return execute(trx)
  }

  // Otherwise, create a new transaction
  return withTenantSchema(schemaName, execute)
}

/**
 * Find chart of account by account number
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountNumber - Account number
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Chart of account object or null if not found
 */
export const findChartOfAccountByNumber = async (
  tenantId: string,
  schemaName: string,
  accountNumber: string,
  trx?: Knex.Transaction
): Promise<ChartOfAccount | null> => {
  const execute = async (transaction: Knex.Transaction) => {
    const account = await ChartOfAccount.query(transaction)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .where('account_number', accountNumber)
      .first()
    return account ?? null
  }

  // If transaction is provided, use it directly
  if (trx) {
    return execute(trx)
  }

  // Otherwise, create a new transaction
  return withTenantSchema(schemaName, execute)
}

/**
 * Interface for creating a chart of account
 */
export interface CreateChartOfAccountData {
  accountNumber?: string
  accountName: string
  accountType: string
  accountSubtype?: string
  accountDetailType?: string
  parentAccountId?: string
  openingBalance?: number
  currencyCode?: string
  description?: string
  trackTax?: boolean
  defaultTaxId?: string
  bankAccountNumber?: string
  bankRoutingNumber?: string
}

/**
 * Create chart of account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param createdBy - User ID who created the account
 * @param data - Account data
 * @returns Created account
 * @throws ApiError if account number already exists
 */
/**
 * Validate account rules before create/update
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param data - Account data to validate
 * @param accountId - Optional account ID (for updates)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
export const validateAccountRules = async (
  tenantId: string,
  schemaName: string,
  data:
    | CreateChartOfAccountData
    | (UpdateChartOfAccountData & { accountType?: string }),
  accountId?: string,
  trx?: Knex.Transaction
): Promise<void> => {
  // Validate parent account type matches child type
  if (data.parentAccountId) {
    const parent = await findChartOfAccountById(
      tenantId,
      schemaName,
      data.parentAccountId,
      trx
    )

    if (
      data.accountType &&
      parent.accountType !== (data.accountType as AccountType)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_PARENT_TYPE_MISMATCH
      )
    }
  }

  // Validate account number uniqueness
  if (data.accountNumber) {
    const existing = await findChartOfAccountByNumber(
      tenantId,
      schemaName,
      data.accountNumber,
      trx
    )

    if (existing && existing.id !== accountId) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_NUMBER_EXISTS
      )
    }
  }

  // Validate cannot change type if has transactions (TODO: implement when journal entries are added)
  if (accountId && data.accountType) {
    const account = await findChartOfAccountById(
      tenantId,
      schemaName,
      accountId,
      trx
    )
    if (account.accountType !== (data.accountType as AccountType)) {
      // Check if account has journal entries
      // TODO: Implement when journal entries are added
      // if (hasJournalEntries) {
      //   throw new ApiError(...)
      // }
    }
  }
}

export const createChartOfAccount = async (
  tenantId: string,
  schemaName: string,
  createdBy: string,
  data: CreateChartOfAccountData
): Promise<ChartOfAccount> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Auto-generate account number if not provided
    let accountNumber = data.accountNumber
    accountNumber ??= await generateAccountNumber(
      tenantId,
      schemaName,
      data.accountType as AccountType,
      trx
    )

    // Validate account rules (pass transaction for nested calls)
    await validateAccountRules(
      tenantId,
      schemaName,
      {
        ...data,
        accountNumber,
      },
      undefined,
      trx
    )

    // Validate parent account exists if provided
    if (data.parentAccountId) {
      const parent = await findChartOfAccountById(
        tenantId,
        schemaName,
        data.parentAccountId,
        trx
      )
      // Validate parent type matches
      if (parent.accountType !== (data.accountType as AccountType)) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.CHART_OF_ACCOUNT_PARENT_TYPE_MISMATCH
        )
      }
    }

    const account = await ChartOfAccount.query(trx).insert({
      tenantId,
      createdBy,
      accountNumber,
      accountName: data.accountName,
      accountType: data.accountType as AccountType,
      accountSubtype: data.accountSubtype ?? null,
      accountDetailType: data.accountDetailType ?? null,
      parentAccountId: data.parentAccountId ?? null,
      openingBalance: data.openingBalance ?? 0,
      currentBalance: data.openingBalance ?? 0,
      currencyCode: data.currencyCode ?? 'CAD',
      description: data.description ?? null,
      trackTax: data.trackTax ?? false,
      defaultTaxId: data.defaultTaxId ?? null,
      bankAccountNumber: data.bankAccountNumber ?? null,
      bankRoutingNumber: data.bankRoutingNumber ?? null,
      isActive: true,
      isSystemAccount: false,
    })

    return account
  })
}

/**
 * Interface for updating a chart of account
 */
export interface UpdateChartOfAccountData {
  accountNumber?: string
  accountName?: string
  accountSubtype?: string
  accountDetailType?: string
  parentAccountId?: string | null
  currencyCode?: string
  description?: string | null
  trackTax?: boolean
  defaultTaxId?: string | null
  bankAccountNumber?: string | null
  bankRoutingNumber?: string | null
  isActive?: boolean
}

/**
 * Update chart of account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param data - Update data
 * @returns Updated account
 * @throws ApiError if account number already exists or parent account doesn't exist
 */
export const updateChartOfAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  data: UpdateChartOfAccountData
): Promise<ChartOfAccount> => {
  // Get account first to ensure it exists and belongs to tenant
  const account = await findChartOfAccountById(tenantId, schemaName, accountId)

  // Check if it's a system account (cannot be modified)
  if (account.isSystemAccount) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.CHART_OF_ACCOUNT_IS_SYSTEM
    )
  }

  // Check if account number is being changed and if it already exists
  if (data.accountNumber && data.accountNumber !== account.accountNumber) {
    const existing = await findChartOfAccountByNumber(
      tenantId,
      schemaName,
      data.accountNumber
    )
    if (existing && existing.id !== accountId) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_NUMBER_EXISTS
      )
    }
  }

  // Validate account rules
  await validateAccountRules(tenantId, schemaName, data, accountId)

  // Validate parent account exists if provided
  if (data.parentAccountId) {
    await findChartOfAccountById(tenantId, schemaName, data.parentAccountId)
    // Note: accountType cannot be changed in update, so we don't validate it here
    // Parent type validation is handled in validateAccountRules
  }

  return withTenantSchema(schemaName, async (trx) => {
    const updatedAccount = await account.$query(trx).patchAndFetch(data)
    return updatedAccount
  })
}

/**
 * Delete chart of account (soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Deleted account
 * @throws ApiError if account has children or is a system account
 */
export const deleteChartOfAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string
): Promise<ChartOfAccount> => {
  // Verify account exists and belongs to tenant
  const account = await findChartOfAccountById(tenantId, schemaName, accountId)

  // Check if it's a system account (cannot be deleted)
  if (account.isSystemAccount) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.CHART_OF_ACCOUNT_IS_SYSTEM
    )
  }

  return withTenantSchema(schemaName, async (trx) => {
    // Check if account has children
    const hasChildren = await ChartOfAccount.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .where('parent_account_id', accountId)
      .first()

    if (hasChildren) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_HAS_CHILDREN
      )
    }

    // Soft delete using direct Knex update (bypasses Objection validation)
    await trx('chart_of_accounts')
      .where('id', accountId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: getCurrentDate(),
        updated_at: getCurrentDate(),
      })

    // Reload to get updated data (without notDeleted modifier to include deleted records)
    const deletedAccount = await ChartOfAccount.query(trx)
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!deletedAccount) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND
      )
    }

    return deletedAccount
  })
}

/**
 * Get account hierarchy (parent accounts with children)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @returns Array of top-level accounts with their children
 */
export const getAccountHierarchy = async (
  tenantId: string,
  schemaName: string
): Promise<ChartOfAccount[]> => {
  return withTenantSchema(schemaName, async (trx) => {
    return ChartOfAccount.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('active')
      .modify('topLevel')
      .withGraphFetched('children')
      .modifyGraph('children', (builder) => {
        builder
          .modify('notDeleted')
          .modify('byTenant', tenantId)
          .modify('active')
          .orderBy('account_number', 'asc')
          .orderBy('account_name', 'asc')
      })
      .orderBy('account_number', 'asc')
      .orderBy('account_name', 'asc')
  })
}

/**
 * Update chart of account activation status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param isActive - Activation status (true = active, false = inactive)
 * @returns Updated account
 */
export const updateChartOfAccountActivationStatus = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  isActive: boolean
): Promise<ChartOfAccount> => {
  // Get account first to ensure it exists and belongs to tenant
  const account = await findChartOfAccountById(tenantId, schemaName, accountId)

  return withTenantSchema(schemaName, async (trx) => {
    const updatedAccount = await account.$query(trx).patchAndFetch({ isActive })
    return updatedAccount
  })
}

/**
 * Restore chart of account (un-soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Restored account
 */
export const restoreChartOfAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string
): Promise<ChartOfAccount> => {
  return withTenantSchema(schemaName, async (trx) => {
    const account = await ChartOfAccount.query(trx)
      .modify('deleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND
      )
    }

    // Restore the account
    await trx('chart_of_accounts')
      .where('id', accountId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: null,
        updated_at: getCurrentDate(),
      })

    // Reload to get updated data
    const restoredAccount = await ChartOfAccount.query(trx)
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!restoredAccount) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND
      )
    }

    return restoredAccount
  })
}

/**
 * Update chart of account balance from transaction/journal entry
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param amount - Amount to add/subtract
 * @param isDebit - true for debit, false for credit
 * @returns Updated account
 */
export const updateChartOfAccountBalance = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  amount: number,
  isDebit: boolean
): Promise<ChartOfAccount> => {
  return withTenantSchema(schemaName, async (trx) => {
    const account = await ChartOfAccount.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND
      )
    }

    const amountNum = Number(amount || 0)
    const newBalance = account.updateBalance(amountNum, isDebit)

    const updated = await account.$query(trx).patchAndFetch({
      currentBalance: Number(newBalance),
    })

    return updated
  })
}

/**
 * Link a bank account to a chart of account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param chartAccountId - Chart of account ID
 * @param bankAccountId - Bank account ID (from accounts table)
 * @returns Updated chart account
 */
export const linkBankAccountToChartAccount = async (
  tenantId: string,
  schemaName: string,
  chartAccountId: string,
  bankAccountId: string
): Promise<ChartOfAccount> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify chart account exists
    const chartAccount = await findChartOfAccountById(
      tenantId,
      schemaName,
      chartAccountId,
      trx
    )

    // Verify bank account exists (import Account model)
    const { Account } = await import('@models/Account')
    const bankAccount = await Account.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(bankAccountId)

    if (!bankAccount) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND
      )
    }

    // Update chart account with bank account link
    const updated = await chartAccount.$query(trx).patchAndFetch({
      bankAccountId,
      bankAccountNumber: bankAccount.number ?? null,
    })

    return updated
  })
}
