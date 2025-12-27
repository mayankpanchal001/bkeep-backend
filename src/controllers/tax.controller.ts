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
  createTax,
  deleteTax,
  findActiveTaxes,
  findTaxById,
  findTaxes,
  getTaxStatistics,
  getTaxStatus,
  restoreTax,
  updateTax,
  updateTaxActivationStatus,
} from '@queries/tax.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all taxes controller
 * Retrieves taxes with pagination, sorting, search, and filtering
 * Taxes are filtered by tenant from tenant context
 */
export const getAllTaxes: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated query parameters
    const filters = (
      req as TenantRequest & {
        validatedData: Parameters<typeof findTaxes>[2]
      }
    ).validatedData

    // Fetch taxes
    const { taxes, total } = await findTaxes(
      tenantContext.tenantId,
      tenantContext.schemaName,
      filters
    )

    // Transform taxes to response format (exclude internal fields)
    const taxesData = taxes.map((tax) => ({
      id: tax.id,
      name: tax.name,
      type: tax.type,
      rate: tax.rate,
      isActive: tax.isActive,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    }))

    // Get pagination metadata
    const pagination = getPaginationMetadata(filters.page, filters.limit, total)

    // Prepare response data
    const responseData = {
      items: taxesData,
      pagination,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAXES_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Get active taxes controller
 * Retrieves only active taxes (no pagination)
 */
export const getActiveTaxes: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Fetch active taxes
    const taxes = await findActiveTaxes(
      tenantContext.tenantId,
      tenantContext.schemaName
    )

    // Transform taxes to response format
    const taxesData = taxes.map((tax) => ({
      id: tax.id,
      name: tax.name,
      type: tax.type,
      rate: tax.rate,
      isActive: tax.isActive,
    }))

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAXES_FETCHED,
          taxesData
        )
      )
  }
)

/**
 * Get tax by ID controller
 * Retrieves a specific tax by their ID
 */
export const getTaxById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch tax
    const tax = await findTaxById(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax to response format
    const responseData = {
      id: tax.id,
      name: tax.name,
      type: tax.type,
      rate: tax.rate,
      isActive: tax.isActive,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Create tax controller
 * Creates a new tax
 */
export const createTaxController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated body
    const taxData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof createTax>[2]
      }
    ).validatedData

    // Create tax
    const tax = await createTax(
      tenantContext.tenantId,
      tenantContext.schemaName,
      taxData,
      user.id
    )

    // Transform tax to response format
    const responseData = {
      id: tax.id,
      name: tax.name,
      type: tax.type,
      rate: tax.rate,
      isActive: tax.isActive,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.TAX_CREATED,
          responseData
        )
      )
  }
)

/**
 * Update tax controller
 * Updates tax information
 */
export const updateTaxController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const updateData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof updateTax>[3]
      }
    ).validatedData

    // Update tax
    const updatedTax = await updateTax(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      updateData
    )

    // Transform tax to response format
    const responseData = {
      id: updatedTax.id,
      name: updatedTax.name,
      type: updatedTax.type,
      rate: updatedTax.rate,
      isActive: updatedTax.isActive,
      updatedAt: updatedTax.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_UPDATED,
          responseData
        )
      )
  }
)

/**
 * Delete tax controller
 * Soft deletes a tax by their ID
 */
export const deleteTaxById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Delete tax
    const deletedTax = await deleteTax(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax to response format
    const responseData = {
      id: deletedTax.id,
      name: deletedTax.name,
      deletedAt: deletedTax.deletedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_DELETED,
          responseData
        )
      )
  }
)

/**
 * Restore tax controller
 * Restores a soft-deleted tax
 */
export const restoreTaxById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Restore tax
    const restoredTax = await restoreTax(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax to response format
    const responseData = {
      id: restoredTax.id,
      name: restoredTax.name,
      isActive: restoredTax.isActive,
      updatedAt: restoredTax.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_RESTORED,
          responseData
        )
      )
  }
)

/**
 * Enable tax controller
 * Enables a tax by setting isActive to true
 */
export const enableTax: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Enable tax
    const enabledTax = await updateTaxActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      true
    )

    // Transform tax to response format
    const responseData = {
      id: enabledTax.id,
      name: enabledTax.name,
      isActive: enabledTax.isActive,
      updatedAt: enabledTax.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_ENABLED,
          responseData
        )
      )
  }
)

/**
 * Disable tax controller
 * Disables a tax by setting isActive to false
 */
export const disableTax: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Disable tax
    const disabledTax = await updateTaxActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      false
    )

    // Transform tax to response format
    const responseData = {
      id: disabledTax.id,
      name: disabledTax.name,
      isActive: disabledTax.isActive,
      updatedAt: disabledTax.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_DISABLED,
          responseData
        )
      )
  }
)

/**
 * Get tax status controller
 * Retrieves the status information of a specific tax
 */
export const getTaxStatusController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch tax status
    const statusData = await getTaxStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_STATUS_RETRIEVED,
          statusData
        )
      )
  }
)

/**
 * Get tax statistics controller
 * Retrieves aggregate statistics about taxes
 */
export const getTaxStatisticsController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Fetch tax statistics
    const statistics = await getTaxStatistics(
      tenantContext.tenantId,
      tenantContext.schemaName
    )

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_STATISTICS_RETRIEVED,
          statistics
        )
      )
  }
)
