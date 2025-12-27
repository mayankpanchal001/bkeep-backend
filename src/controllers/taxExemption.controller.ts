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
  createTaxExemption,
  deleteTaxExemption,
  findTaxExemptionById,
  findTaxExemptions,
  restoreTaxExemption,
  updateTaxExemption,
  updateTaxExemptionActivationStatus,
} from '@queries/taxExemption.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all tax exemptions controller
 * Retrieves tax exemptions with pagination, sorting, search, and filtering
 */
export const getAllTaxExemptions: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated query parameters
    const filters = (
      req as TenantRequest & {
        validatedData: Parameters<typeof findTaxExemptions>[2]
      }
    ).validatedData

    // Fetch tax exemptions
    const { taxExemptions, total } = await findTaxExemptions(
      tenantContext.tenantId,
      tenantContext.schemaName,
      filters
    )

    // Transform tax exemptions to response format
    const responseData = taxExemptions.map((exemption) => ({
      id: exemption.id,
      contactId: exemption.contactId,
      taxId: exemption.taxId ?? null,
      tax: exemption.tax
        ? {
            id: exemption.tax.id,
            name: exemption.tax.name,
            type: exemption.tax.type,
            rate: exemption.tax.rate,
          }
        : null,
      exemptionType: exemption.exemptionType,
      certificateNumber: exemption.certificateNumber ?? null,
      certificateExpiry: exemption.certificateExpiry ?? null,
      reason: exemption.reason ?? null,
      isActive: exemption.isActive,
      createdAt: exemption.createdAt,
      updatedAt: exemption.updatedAt,
    }))

    // Return response with pagination
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.TAX_EXEMPTIONS_FETCHED, {
        items: responseData,
        pagination: getPaginationMetadata(filters.page, filters.limit, total),
      })
    )
  }
)

/**
 * Get tax exemption by ID controller
 * Retrieves a single tax exemption by ID
 */
export const getTaxExemptionById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch tax exemption
    const taxExemption = await findTaxExemptionById(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax exemption to response format
    const responseData = {
      id: taxExemption.id,
      contactId: taxExemption.contactId,
      taxId: taxExemption.taxId ?? null,
      tax: taxExemption.tax
        ? {
            id: taxExemption.tax.id,
            name: taxExemption.tax.name,
            type: taxExemption.tax.type,
            rate: taxExemption.tax.rate,
          }
        : null,
      exemptionType: taxExemption.exemptionType,
      certificateNumber: taxExemption.certificateNumber ?? null,
      certificateExpiry: taxExemption.certificateExpiry ?? null,
      reason: taxExemption.reason ?? null,
      isActive: taxExemption.isActive,
      createdAt: taxExemption.createdAt,
      updatedAt: taxExemption.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_EXEMPTION_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Create tax exemption controller
 * Creates a new tax exemption
 */
export const createTaxExemptionController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated body
    const taxExemptionData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof createTaxExemption>[2]
      }
    ).validatedData

    // Create tax exemption
    const taxExemption = await createTaxExemption(
      tenantContext.tenantId,
      tenantContext.schemaName,
      taxExemptionData,
      user.id
    )

    // Transform tax exemption to response format
    const responseData = {
      id: taxExemption.id,
      contactId: taxExemption.contactId,
      taxId: taxExemption.taxId ?? null,
      tax: taxExemption.tax
        ? {
            id: taxExemption.tax.id,
            name: taxExemption.tax.name,
            type: taxExemption.tax.type,
            rate: taxExemption.tax.rate,
          }
        : null,
      exemptionType: taxExemption.exemptionType,
      certificateNumber: taxExemption.certificateNumber ?? null,
      certificateExpiry: taxExemption.certificateExpiry ?? null,
      reason: taxExemption.reason ?? null,
      isActive: taxExemption.isActive,
      createdAt: taxExemption.createdAt,
      updatedAt: taxExemption.updatedAt,
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.TAX_EXEMPTION_CREATED,
          responseData
        )
      )
  }
)

/**
 * Update tax exemption controller
 * Updates tax exemption information
 */
export const updateTaxExemptionController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const updateData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof updateTaxExemption>[3]
      }
    ).validatedData

    // Update tax exemption
    const updatedTaxExemption = await updateTaxExemption(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      updateData
    )

    // Transform tax exemption to response format
    const responseData = {
      id: updatedTaxExemption.id,
      contactId: updatedTaxExemption.contactId,
      taxId: updatedTaxExemption.taxId ?? null,
      tax: updatedTaxExemption.tax
        ? {
            id: updatedTaxExemption.tax.id,
            name: updatedTaxExemption.tax.name,
            type: updatedTaxExemption.tax.type,
            rate: updatedTaxExemption.tax.rate,
          }
        : null,
      exemptionType: updatedTaxExemption.exemptionType,
      certificateNumber: updatedTaxExemption.certificateNumber ?? null,
      certificateExpiry: updatedTaxExemption.certificateExpiry ?? null,
      reason: updatedTaxExemption.reason ?? null,
      isActive: updatedTaxExemption.isActive,
      updatedAt: updatedTaxExemption.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_EXEMPTION_UPDATED,
          responseData
        )
      )
  }
)

/**
 * Delete tax exemption controller
 * Soft deletes a tax exemption
 */
export const deleteTaxExemptionById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Delete tax exemption
    const deletedTaxExemption = await deleteTaxExemption(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax exemption to response format
    const responseData = {
      id: deletedTaxExemption.id,
      contactId: deletedTaxExemption.contactId,
      deletedAt: deletedTaxExemption.deletedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_EXEMPTION_DELETED,
          responseData
        )
      )
  }
)

/**
 * Restore tax exemption controller
 * Restores a soft-deleted tax exemption
 */
export const restoreTaxExemptionById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Restore tax exemption
    const restoredTaxExemption = await restoreTaxExemption(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax exemption to response format
    const responseData = {
      id: restoredTaxExemption.id,
      contactId: restoredTaxExemption.contactId,
      isActive: restoredTaxExemption.isActive,
      updatedAt: restoredTaxExemption.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_EXEMPTION_RESTORED,
          responseData
        )
      )
  }
)

/**
 * Enable tax exemption controller
 * Enables a tax exemption
 */
export const enableTaxExemption: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Enable tax exemption
    const enabledTaxExemption = await updateTaxExemptionActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      true
    )

    // Transform tax exemption to response format
    const responseData = {
      id: enabledTaxExemption.id,
      contactId: enabledTaxExemption.contactId,
      isActive: enabledTaxExemption.isActive,
      updatedAt: enabledTaxExemption.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_EXEMPTION_ENABLED,
          responseData
        )
      )
  }
)

/**
 * Disable tax exemption controller
 * Disables a tax exemption
 */
export const disableTaxExemption: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Disable tax exemption
    const disabledTaxExemption = await updateTaxExemptionActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      false
    )

    // Transform tax exemption to response format
    const responseData = {
      id: disabledTaxExemption.id,
      contactId: disabledTaxExemption.contactId,
      isActive: disabledTaxExemption.isActive,
      updatedAt: disabledTaxExemption.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_EXEMPTION_DISABLED,
          responseData
        )
      )
  }
)
