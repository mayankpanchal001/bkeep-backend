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
  calculateTaxWithGroup,
  createTaxGroup,
  deleteTaxGroup,
  findActiveTaxGroups,
  findTaxGroupById,
  findTaxGroups,
  restoreTaxGroup,
  updateTaxGroup,
  updateTaxGroupActivationStatus,
} from '@queries/taxGroup.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all tax groups controller
 * Retrieves tax groups with pagination, sorting, search, and filtering
 */
export const getAllTaxGroups: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated query parameters
    const filters = (
      req as TenantRequest & {
        validatedData: Parameters<typeof findTaxGroups>[2]
      }
    ).validatedData

    // Fetch tax groups
    const { taxGroups, total } = await findTaxGroups(
      tenantContext.tenantId,
      tenantContext.schemaName,
      filters
    )

    // Transform tax groups to response format
    const responseData = taxGroups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description ?? null,
      isActive: group.isActive,
      taxes:
        group.taxes?.map((tax) => ({
          id: tax.id,
          name: tax.name,
          type: tax.type,
          rate: tax.rate,
        })) ?? [],
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }))

    // Return response with pagination
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.TAX_GROUPS_FETCHED, {
        items: responseData,
        pagination: getPaginationMetadata(filters.page, filters.limit, total),
      })
    )
  }
)

/**
 * Get active tax groups controller
 * Retrieves only active tax groups
 */
export const getActiveTaxGroups: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Fetch active tax groups
    const taxGroups = await findActiveTaxGroups(
      tenantContext.tenantId,
      tenantContext.schemaName
    )

    // Transform tax groups to response format
    const responseData = taxGroups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description ?? null,
      isActive: group.isActive,
      taxes:
        group.taxes?.map((tax) => ({
          id: tax.id,
          name: tax.name,
          type: tax.type,
          rate: tax.rate,
        })) ?? [],
    }))

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUPS_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Get tax group by ID controller
 * Retrieves a single tax group by ID
 */
export const getTaxGroupById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Fetch tax group
    const taxGroup = await findTaxGroupById(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax group to response format
    const responseData = {
      id: taxGroup.id,
      name: taxGroup.name,
      description: taxGroup.description ?? null,
      isActive: taxGroup.isActive,
      taxes:
        taxGroup.taxes?.map((tax) => ({
          id: tax.id,
          name: tax.name,
          type: tax.type,
          rate: tax.rate,
        })) ?? [],
      createdAt: taxGroup.createdAt,
      updatedAt: taxGroup.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUP_FETCHED,
          responseData
        )
      )
  }
)

/**
 * Create tax group controller
 * Creates a new tax group
 */
export const createTaxGroupController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const user = req.user as JwtUser

    // Get validated body
    const taxGroupData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof createTaxGroup>[2]
      }
    ).validatedData

    // Create tax group
    const taxGroup = await createTaxGroup(
      tenantContext.tenantId,
      tenantContext.schemaName,
      taxGroupData,
      user.id
    )

    // Transform tax group to response format
    const responseData = {
      id: taxGroup.id,
      name: taxGroup.name,
      description: taxGroup.description ?? null,
      isActive: taxGroup.isActive,
      taxes:
        taxGroup.taxes?.map((tax) => ({
          id: tax.id,
          name: tax.name,
          type: tax.type,
          rate: tax.rate,
        })) ?? [],
      createdAt: taxGroup.createdAt,
      updatedAt: taxGroup.updatedAt,
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.TAX_GROUP_CREATED,
          responseData
        )
      )
  }
)

/**
 * Update tax group controller
 * Updates tax group information
 */
export const updateTaxGroupController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const updateData = (
      req as TenantRequest & {
        validatedData: Parameters<typeof updateTaxGroup>[3]
      }
    ).validatedData

    // Update tax group
    const updatedTaxGroup = await updateTaxGroup(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      updateData
    )

    // Transform tax group to response format
    const responseData = {
      id: updatedTaxGroup.id,
      name: updatedTaxGroup.name,
      description: updatedTaxGroup.description ?? null,
      isActive: updatedTaxGroup.isActive,
      taxes:
        updatedTaxGroup.taxes?.map((tax) => ({
          id: tax.id,
          name: tax.name,
          type: tax.type,
          rate: tax.rate,
        })) ?? [],
      updatedAt: updatedTaxGroup.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUP_UPDATED,
          responseData
        )
      )
  }
)

/**
 * Delete tax group controller
 * Soft deletes a tax group
 */
export const deleteTaxGroupById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Delete tax group
    const deletedTaxGroup = await deleteTaxGroup(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax group to response format
    const responseData = {
      id: deletedTaxGroup.id,
      name: deletedTaxGroup.name,
      deletedAt: deletedTaxGroup.deletedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUP_DELETED,
          responseData
        )
      )
  }
)

/**
 * Restore tax group controller
 * Restores a soft-deleted tax group
 */
export const restoreTaxGroupById: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Restore tax group
    const restoredTaxGroup = await restoreTaxGroup(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id
    )

    // Transform tax group to response format
    const responseData = {
      id: restoredTaxGroup.id,
      name: restoredTaxGroup.name,
      isActive: restoredTaxGroup.isActive,
      updatedAt: restoredTaxGroup.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUP_RESTORED,
          responseData
        )
      )
  }
)

/**
 * Enable tax group controller
 * Enables a tax group
 */
export const enableTaxGroup: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Enable tax group
    const enabledTaxGroup = await updateTaxGroupActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      true
    )

    // Transform tax group to response format
    const responseData = {
      id: enabledTaxGroup.id,
      name: enabledTaxGroup.name,
      isActive: enabledTaxGroup.isActive,
      updatedAt: enabledTaxGroup.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUP_ENABLED,
          responseData
        )
      )
  }
)

/**
 * Disable tax group controller
 * Disables a tax group
 */
export const disableTaxGroup: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    // Disable tax group
    const disabledTaxGroup = await updateTaxGroupActivationStatus(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      false
    )

    // Transform tax group to response format
    const responseData = {
      id: disabledTaxGroup.id,
      name: disabledTaxGroup.name,
      isActive: disabledTaxGroup.isActive,
      updatedAt: disabledTaxGroup.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUP_DISABLED,
          responseData
        )
      )
  }
)

/**
 * Calculate tax with tax group controller
 * Calculates tax amount using a tax group
 */
export const calculateTaxGroupController: RequestHandler = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext

    // Get validated params and body
    const { id } = (req as TenantRequest & { params: { id: string } }).params

    const { amount } = (
      req as TenantRequest & {
        validatedData: { amount: number }
      }
    ).validatedData

    // Calculate tax
    const calculation = await calculateTaxWithGroup(
      tenantContext.tenantId,
      tenantContext.schemaName,
      id,
      amount
    )

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TAX_GROUP_CALCULATED,
          calculation
        )
      )
  }
)
