import type { RequestHandler } from 'express'
import { Response } from 'express'
import * as XLSX from 'xlsx'

import type { JwtUser } from '@/types/jwt.type'
import { CHART_OF_ACCOUNT_SAMPLE } from '@constants/chartOfAccount'
import { HTTP_STATUS } from '@constants/http'
import { SUCCESS_MESSAGES } from '@constants/success'
import {
  getTenantContext,
  type TenantContext,
  type TenantRequest,
} from '@middlewares/tenantContext.middleware'
import {
  createChartOfAccount,
  deleteChartOfAccount,
  findChartOfAccountById,
  findChartOfAccounts,
  getAccountHierarchy,
  restoreChartOfAccount,
  updateChartOfAccount,
  updateChartOfAccountActivationStatus,
} from '@queries/chartOfAccount.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all chart of accounts controller
 * Retrieves chart of accounts with pagination, sorting, search, and filtering
 * Accounts are filtered by tenant from tenant context
 */
export const getAllChartOfAccounts: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated query parameters
    const filters = (
      req as TenantRequest & {
        validatedData: Parameters<typeof findChartOfAccounts>[2]
      }
    ).validatedData

    // Fetch accounts
    const { accounts, total } = await findChartOfAccounts(
      tenantContext.tenantId,
      tenantContext.schemaName,
      filters
    )

    // Transform accounts to response format (exclude internal fields)
    const accountsData = accounts.map((account) => ({
      id: account.id,
      accountNumber: account.accountNumber ?? null,
      accountName: account.accountName,
      accountType: account.accountType,
      accountSubtype: account.accountSubtype ?? null,
      accountDetailType: account.accountDetailType ?? null,
      parentAccountId: account.parentAccountId ?? null,
      currentBalance: account.currentBalance,
      openingBalance: account.openingBalance,
      currencyCode: account.currencyCode,
      isActive: account.isActive,
      description: account.description ?? null,
      trackTax: account.trackTax,
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
          SUCCESS_MESSAGES.CHART_OF_ACCOUNTS_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Get chart of account hierarchy controller
 * Retrieves top-level accounts with their children
 */
export const getChartOfAccountHierarchy: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Fetch hierarchy
    const hierarchy = await getAccountHierarchy(
      tenantContext.tenantId,
      tenantContext.schemaName
    )

    // Transform accounts to response format
    const hierarchyData = hierarchy.map((account) => ({
      id: account.id,
      accountNumber: account.accountNumber ?? null,
      accountName: account.accountName,
      accountType: account.accountType,
      accountSubtype: account.accountSubtype ?? null,
      currentBalance: account.currentBalance,
      currencyCode: account.currencyCode,
      isActive: account.isActive,
      children: account.children?.map((child) => ({
        id: child.id,
        accountNumber: child.accountNumber ?? null,
        accountName: child.accountName,
        accountType: child.accountType,
        currentBalance: child.currentBalance,
        currencyCode: child.currencyCode,
        isActive: child.isActive,
      })),
    }))

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNTS_FETCHED,
          hierarchyData
        )
      )
  }
)

/**
 * Get chart of account by ID controller
 * Retrieves a specific account by their ID
 */
export const getChartOfAccountById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch account
    const account = await findChartOfAccountById(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform account to response format (exclude internal fields)
    const accountData = {
      id: account.id,
      accountNumber: account.accountNumber ?? null,
      accountName: account.accountName,
      accountType: account.accountType,
      accountSubtype: account.accountSubtype ?? null,
      accountDetailType: account.accountDetailType ?? null,
      parentAccountId: account.parentAccountId ?? null,
      currentBalance: account.currentBalance,
      openingBalance: account.openingBalance,
      currencyCode: account.currencyCode,
      isActive: account.isActive,
      isSystemAccount: account.isSystemAccount,
      description: account.description ?? null,
      trackTax: account.trackTax,
      defaultTaxId: account.defaultTaxId ?? null,
      bankAccountNumber: account.bankAccountNumber ?? null,
      bankRoutingNumber: account.bankRoutingNumber ?? null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_FETCHED,
          accountData
        )
      )
  }
)

/**
 * Create chart of account controller
 * Creates a new account in the tenant schema
 */
export const createChartOfAccountController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated body data
    const accountData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof createChartOfAccount>[3]
      }
    ).validatedData

    // Create account
    const account = await createChartOfAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      user.id,
      accountData
    )

    // Transform account to response format
    const responseData = {
      id: account.id,
      accountNumber: account.accountNumber ?? null,
      accountName: account.accountName,
      accountType: account.accountType,
      accountSubtype: account.accountSubtype ?? null,
      currentBalance: account.currentBalance,
      openingBalance: account.openingBalance,
      currencyCode: account.currencyCode,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_CREATED,
          responseData
        )
      )
  }
)

/**
 * Update chart of account controller
 * Updates account information
 */
export const updateChartOfAccountController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const updateData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof updateChartOfAccount>[3]
      }
    ).validatedData

    // Update account
    const updatedAccount = await updateChartOfAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      updateData
    )

    // Transform account to response format
    const responseData = {
      id: updatedAccount.id,
      accountNumber: updatedAccount.accountNumber ?? null,
      accountName: updatedAccount.accountName,
      accountType: updatedAccount.accountType,
      currentBalance: updatedAccount.currentBalance,
      isActive: updatedAccount.isActive,
      updatedAt: updatedAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_UPDATED,
          responseData
        )
      )
  }
)

/**
 * Delete chart of account controller
 * Soft deletes an account by their ID
 */
export const deleteChartOfAccountById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Delete account
    const deletedAccount = await deleteChartOfAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform account to response format
    const responseData = {
      id: deletedAccount.id,
      accountNumber: deletedAccount.accountNumber ?? null,
      accountName: deletedAccount.accountName,
      accountType: deletedAccount.accountType,
      deletedAt: deletedAccount.deletedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_DELETED,
          responseData
        )
      )
  }
)

/**
 * Enable chart of account controller
 * Enables an account
 */
export const enableChartOfAccount: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Enable account
    const updatedAccount = await updateChartOfAccountActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      true
    )

    // Transform account to response format
    const responseData = {
      id: updatedAccount.id,
      accountName: updatedAccount.accountName,
      accountType: updatedAccount.accountType,
      isActive: updatedAccount.isActive,
      updatedAt: updatedAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_ENABLED,
          responseData
        )
      )
  }
)

/**
 * Disable chart of account controller
 * Disables an account
 */
export const disableChartOfAccount: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Disable account
    const updatedAccount = await updateChartOfAccountActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      false
    )

    // Transform account to response format
    const responseData = {
      id: updatedAccount.id,
      accountName: updatedAccount.accountName,
      accountType: updatedAccount.accountType,
      isActive: updatedAccount.isActive,
      updatedAt: updatedAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_DISABLED,
          responseData
        )
      )
  }
)

/**
 * Restore chart of account controller
 * Restores a soft-deleted account
 */
export const restoreChartOfAccountById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Restore account
    const restoredAccount = await restoreChartOfAccount(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform account to response format
    const responseData = {
      id: restoredAccount.id,
      accountNumber: restoredAccount.accountNumber ?? null,
      accountName: restoredAccount.accountName,
      accountType: restoredAccount.accountType,
      isActive: restoredAccount.isActive,
      createdAt: restoredAccount.createdAt,
      updatedAt: restoredAccount.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_UPDATED,
          responseData
        )
      )
  }
)

/**
 * Download chart of account sample file controller
 * Generates and downloads an XLSX sample file for importing chart of accounts
 */
export const downloadChartOfAccountSample: RequestHandler = asyncHandler(
  async (_req: TenantRequest, res: Response) => {
    // Prepare sample data
    const sampleData = CHART_OF_ACCOUNT_SAMPLE.SAMPLE_DATA

    // Prepare worksheet data with headers
    const worksheetData = [
      // Header row
      [...CHART_OF_ACCOUNT_SAMPLE.HEADERS],
      // Data rows
      ...sampleData.map((row) => [
        row.accountNumber ?? '',
        row.accountName,
        row.type,
        row.detailType ?? '',
        row.openingBalance ?? '',
      ]),
      // Empty row
      [],
      // Instruction rows
      ...CHART_OF_ACCOUNT_SAMPLE.INSTRUCTIONS.map((instruction) => [
        instruction,
      ]),
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Set column widths for better readability
    worksheet['!cols'] = [...CHART_OF_ACCOUNT_SAMPLE.COLUMN_WIDTHS]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      CHART_OF_ACCOUNT_SAMPLE.WORKSHEET_NAME
    )

    // Generate XLSX buffer
    const xlsxBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    })

    // Set response headers for XLSX download
    res.setHeader('Content-Type', CHART_OF_ACCOUNT_SAMPLE.CONTENT_TYPE)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${CHART_OF_ACCOUNT_SAMPLE.FILENAME}"`
    )
    res.setHeader('Content-Length', xlsxBuffer.length)

    // Send XLSX content
    res.status(HTTP_STATUS.OK).send(xlsxBuffer)
  }
)

/**
 * Get available import fields controller
 * Returns the list of fields that can be mapped during import
 */
export const getImportFields: RequestHandler = asyncHandler(
  async (_req: TenantRequest, res: Response) => {
    const importFields = CHART_OF_ACCOUNT_SAMPLE.IMPORT_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      required: field.required,
    }))

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.CHART_OF_ACCOUNT_IMPORT_FIELDS_FETCHED,
          importFields
        )
      )
  }
)
