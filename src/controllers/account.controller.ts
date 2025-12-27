import type { RequestHandler } from 'express'
import { Response } from 'express'

import type { JwtUser } from '@/types/jwt.type'
import { HTTP_STATUS } from '@constants/http'
import { SUCCESS_MESSAGES } from '@constants/success'
import {
  getTenantContext,
  type TenantContext,
  type TenantRequest,
} from '@middlewares/tenantContext.middleware'
import {
  createAccount,
  deleteAccount,
  findAccountById,
  findAccounts,
  restoreAccount,
  updateAccount,
  updateAccountActivationStatus,
} from '@queries/account.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all accounts controller
 * Retrieves accounts with pagination, sorting, search, and filtering
 * Accounts are filtered by tenant from tenant context
 */
export const getAllAccounts: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated query parameters
    const filters = (
      req as TenantRequest & {
        validatedData: Parameters<typeof findAccounts>[2]
      }
    ).validatedData

    // Fetch accounts
    const { accounts, total } = await findAccounts(
      tenantContext.tenantId,
      tenantContext.schemaName,
      filters
    )

    // Transform accounts to response format
    const accountsData = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      number: account.number ?? null,
      type: account.type,
      currencyCode: account.currencyCode,
      openingBalance: account.openingBalance,
      bankName: account.bankName ?? null,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }))

    // Get pagination metadata
    const pagination = getPaginationMetadata(filters.page, filters.limit, total)

    // Prepare response data
    const responseData = {
      items: accountsData,
      pagination,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNTS_RETRIEVED,
          responseData
        )
      )
  }
)

/**
 * Get account by ID controller
 * Retrieves a specific account by their ID
 */
export const getAccountById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch account
    const account = await findAccountById(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform account to response format
    const accountData = {
      id: account.id,
      name: account.name,
      number: account.number ?? null,
      type: account.type,
      currencyCode: account.currencyCode,
      openingBalance: account.openingBalance,
      bankName: account.bankName ?? null,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNT_RETRIEVED,
          accountData
        )
      )
  }
)

/**
 * Get account status controller
 * Retrieves the status information of an account
 */
export const getAccountStatus: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch account
    const account = await findAccountById(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform account status to response format
    const statusData = {
      id: account.id,
      name: account.name,
      isActive: account.isActive,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNT_STATUS_RETRIEVED,
          statusData
        )
      )
  }
)

/**
 * Create account controller
 * Creates a new account in the tenant schema
 */
export const createAccountController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated body data
    const accountData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof createAccount>[3]
      }
    ).validatedData

    // Create account
    const account = await createAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      user.id,
      accountData
    )

    // Transform account to response format
    const responseData = {
      id: account.id,
      name: account.name,
      number: account.number ?? null,
      type: account.type,
      currencyCode: account.currencyCode,
      openingBalance: account.openingBalance,
      bankName: account.bankName ?? null,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.ACCOUNT_CREATED,
          responseData
        )
      )
  }
)

/**
 * Update account controller
 * Updates account information
 */
export const updateAccountController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const updateData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof updateAccount>[3]
      }
    ).validatedData

    // Update account
    const updatedAccount = await updateAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      updateData
    )

    // Transform account to response format
    const responseData = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      number: updatedAccount.number ?? null,
      currencyCode: updatedAccount.currencyCode,
      openingBalance: updatedAccount.openingBalance,
      bankName: updatedAccount.bankName ?? null,
      isActive: updatedAccount.isActive,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNT_UPDATED,
          responseData
        )
      )
  }
)

/**
 * Delete account controller
 * Soft deletes an account by their ID
 */
export const deleteAccountById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Delete account
    const deletedAccount = await deleteAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform account to response format
    const responseData = {
      id: deletedAccount.id,
      name: deletedAccount.name,
      number: deletedAccount.number ?? null,
      type: deletedAccount.type,
      currencyCode: deletedAccount.currencyCode,
      openingBalance: deletedAccount.openingBalance,
      bankName: deletedAccount.bankName ?? null,
      isActive: deletedAccount.isActive,
      createdAt: deletedAccount.createdAt,
      updatedAt: deletedAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNT_DELETED,
          responseData
        )
      )
  }
)

/**
 * Activate account controller
 * Activates an account
 */
export const activateAccount: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Activate account
    const updatedAccount = await updateAccountActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      true
    )

    // Transform account to response format
    const responseData = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      number: updatedAccount.number ?? null,
      type: updatedAccount.type,
      currencyCode: updatedAccount.currencyCode,
      openingBalance: updatedAccount.openingBalance,
      bankName: updatedAccount.bankName ?? null,
      isActive: updatedAccount.isActive,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNT_ACTIVATED,
          responseData
        )
      )
  }
)

/**
 * Deactivate account controller
 * Deactivates an account
 */
export const deactivateAccount: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Deactivate account
    const updatedAccount = await updateAccountActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      false
    )

    // Transform account to response format
    const responseData = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      number: updatedAccount.number ?? null,
      type: updatedAccount.type,
      currencyCode: updatedAccount.currencyCode,
      openingBalance: updatedAccount.openingBalance,
      bankName: updatedAccount.bankName ?? null,
      isActive: updatedAccount.isActive,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNT_DEACTIVATED,
          responseData
        )
      )
  }
)

/**
 * Restore account controller
 * Restores a soft-deleted account
 */
export const restoreAccountById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Restore account
    const restoredAccount = await restoreAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform account to response format
    const responseData = {
      id: restoredAccount.id,
      name: restoredAccount.name,
      number: restoredAccount.number ?? null,
      type: restoredAccount.type,
      currencyCode: restoredAccount.currencyCode,
      openingBalance: restoredAccount.openingBalance,
      bankName: restoredAccount.bankName ?? null,
      isActive: restoredAccount.isActive,
      createdAt: restoredAccount.createdAt,
      updatedAt: restoredAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ACCOUNT_RESTORED,
          responseData
        )
      )
  }
)
