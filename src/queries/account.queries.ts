import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { Account } from '@models/Account'
import type { AccountListInput } from '@schema/account.schema'
import { calculateOffset } from '@schema/shared.schema'
import { ApiError } from '@utils/ApiError'
import { getCurrentDate, getCurrentISOString } from '@utils/date'
import { withTenantSchema } from '@utils/tenantQuery'

/**
 * Interface for account query result with pagination
 */
export interface AccountQueryResult {
  accounts: Account[]
  total: number
}

/**
 * Map sort field to database column
 */
const mapAccountSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    name: 'name',
    number: 'number',
    currencyCode: 'currency_code',
    openingBalance: 'opening_balance',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }

  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'created_at'
}

/**
 * Find accounts with pagination, sorting, search, and filtering
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing accounts array and total count
 */
export const findAccounts = async (
  tenantId: string,
  schemaName: string,
  filters: AccountListInput
): Promise<AccountQueryResult> => {
  const {
    page,
    limit,
    sort = 'createdAt',
    order = 'asc',
    search,
    isActive,
    currencyCode,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapAccountSortField(sort)

  // Use shared connection with tenant schema search path
  return withTenantSchema(schemaName, async (trx) => {
    // Build base query
    let query = Account.query(trx).modify('notDeleted')

    // Filter by tenant
    query = query.modify('byTenant', tenantId)

    // Apply active filter if provided
    if (isActive !== undefined) {
      if (isActive) {
        query = query.modify('active')
      } else {
        query = query.modify('inactive')
      }
    }

    // Apply currency filter if provided
    if (currencyCode) {
      query = query.where('currency_code', currencyCode)
    }

    // Apply search if provided
    if (search) {
      query = query.modify('search', search)
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
 * Find account by ID
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID (UUID)
 * @returns Account object
 * @throws ApiError if account not found
 */
export const findAccountById = async (
  tenantId: string,
  schemaName: string,
  accountId: string
): Promise<Account> => {
  // Use shared connection with tenant schema search path
  return withTenantSchema(schemaName, async (trx) => {
    const account = await Account.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND
      )
    }

    return account
  })
}

/**
 * Interface for creating an account
 */
export interface CreateAccountData {
  name: string
  number?: string | null
  type?: string
  currencyCode?: string
  openingBalance?: number
  bankName?: string | null
  isActive?: boolean
}

/**
 * Create account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param createdBy - User ID who created the account
 * @param data - Account data
 * @returns Created account
 */
export const createAccount = async (
  tenantId: string,
  schemaName: string,
  createdBy: string,
  data: CreateAccountData
): Promise<Account> => {
  // Use shared connection with tenant schema search path
  return withTenantSchema(schemaName, async (trx) => {
    const account = await Account.query(trx).insert({
      tenantId,
      createdBy,
      name: data.name,
      number: data.number ?? null,
      type: data.type ?? 'bank',
      currencyCode: data.currencyCode ?? 'CAD',
      openingBalance: data.openingBalance ?? 0,
      currentBalance: data.openingBalance ?? 0, // Initialize current balance to opening balance
      bankName: data.bankName ?? null,
      isActive: data.isActive ?? true,
    })

    return account
  })
}

/**
 * Interface for updating an account
 */
export interface UpdateAccountData {
  name?: string
  number?: string | null
  type?: string
  currencyCode?: string
  openingBalance?: number
  bankName?: string | null
  isActive?: boolean
}

/**
 * Update account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param data - Update data
 * @returns Updated account
 */
export const updateAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  data: UpdateAccountData
): Promise<Account> => {
  // Get account first to ensure it exists and belongs to tenant
  const account = await findAccountById(tenantId, schemaName, accountId)

  // Use shared connection with tenant schema search path
  return withTenantSchema(schemaName, async (trx) => {
    const updatedAccount = await account.$query(trx).patchAndFetch(data)
    return updatedAccount
  })
}

/**
 * Delete account (soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Deleted account
 */
export const deleteAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string
): Promise<Account> => {
  // Verify account exists and belongs to tenant
  await findAccountById(tenantId, schemaName, accountId)

  // Use shared connection with tenant schema search path
  return withTenantSchema(schemaName, async (trx) => {
    // Use BaseModel softDelete() method which handles timestamps automatically
    const account = await Account.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND
      )
    }

    // Use BaseModel softDelete() - it handles deletedAt and updatedAt automatically
    await account
      .$query(trx)
      .patch({ deletedAt: getCurrentISOString() as unknown as Date })

    // Reload to get updated data (without notDeleted modifier to include deleted records)
    const deletedAccount = await Account.query(trx)
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!deletedAccount) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND
      )
    }

    return deletedAccount
  })
}

/**
 * Update account activation status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param isActive - Activation status (true = active, false = inactive)
 * @returns Updated account
 */
export const updateAccountActivationStatus = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  isActive: boolean
): Promise<Account> => {
  // Get account first to ensure it exists and belongs to tenant
  const account = await findAccountById(tenantId, schemaName, accountId)

  // Use shared connection with tenant schema search path
  return withTenantSchema(schemaName, async (trx) => {
    const updatedAccount = await account.$query(trx).patchAndFetch({ isActive })
    return updatedAccount
  })
}

/**
 * Restore account (un-soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Restored account
 */
export const restoreAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string
): Promise<Account> => {
  // Use shared connection with tenant schema search path
  return withTenantSchema(schemaName, async (trx) => {
    const account = await Account.query(trx)
      .modify('deleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND_OR_NOT_DELETED
      )
    }

    // Restore the account using BaseModel restore() which handles timestamps automatically
    await account.$query(trx).patch({ deletedAt: null })

    // Reload to get updated data
    const restoredAccount = await Account.query(trx)
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!restoredAccount) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND
      )
    }

    return restoredAccount
  })
}

/**
 * Update account balance from transaction
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param amount - Amount to add/subtract
 * @param isIncrease - true to increase balance, false to decrease
 * @returns Updated account
 */
export const updateAccountBalance = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  amount: number,
  isIncrease: boolean
): Promise<Account> => {
  return withTenantSchema(schemaName, async (trx) => {
    const account = await Account.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND
      )
    }

    const amountNum = Number(amount || 0)
    const newBalance = account.updateBalance(amountNum, isIncrease)

    const updated = await account.$query(trx).patchAndFetch({
      currentBalance: Number(newBalance),
    })

    return updated
  })
}

/**
 * Reconcile account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param reconciledBalance - Balance at reconciliation
 * @param reconciledBy - User ID who performed reconciliation
 * @returns Updated account
 */
export const reconcileAccount = async (
  tenantId: string,
  schemaName: string,
  accountId: string,
  reconciledBalance: number,
  reconciledBy: string
): Promise<Account> => {
  return withTenantSchema(schemaName, async (trx) => {
    const account = await Account.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(accountId)

    if (!account) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND
      )
    }

    const updated = await account.$query(trx).patchAndFetch({
      lastReconciledAt: getCurrentDate(),
      reconciledBalance,
      lastReconciledBy: reconciledBy,
    })

    return updated
  })
}
