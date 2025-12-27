import type { RequestHandler } from 'express'
import { Response } from 'express'

import { HTTP_STATUS } from '@constants/http'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import {
  getRoleStatistics as fetchRoleStatistics,
  findRoleById,
  findRoleByIdWithPermissions,
  findRoles,
  updateRolePermissions,
} from '@queries/role.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all roles controller
 * Retrieves roles with pagination, sorting, search, and filtering
 */
export const getAllRoles: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get validated query parameters
    const filters = (
      req as AuthenticatedRequest & {
        validatedData: Parameters<typeof findRoles>[0]
      }
    ).validatedData

    // Fetch roles with filters
    const { roles, total } = await findRoles(filters)

    // Transform roles to response format
    const rolesData = roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }))

    // Get pagination metadata
    const pagination = getPaginationMetadata(filters.page, filters.limit, total)

    // Prepare response data
    const responseData = {
      items: rolesData,
      pagination,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ROLES_RETRIEVED,
          responseData
        )
      )
  }
)

/**
 * Get role by ID controller
 * Retrieves a specific role by its ID (excluding superadmin)
 */
export const getRoleById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string

    // Fetch role by ID
    const role = await findRoleById(id)

    // Transform role to response format
    const roleData = {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ROLE_RETRIEVED,
          roleData
        )
      )
  }
)

/**
 * Get role with available permissions controller
 * Retrieves a specific role by its ID with its assigned permissions
 */
export const getRoleWithPermissions: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string

    // Fetch role by ID with permissions
    const role = await findRoleByIdWithPermissions(id)

    // Transform permissions to response format
    const permissionsData =
      role.permissions?.map(
        (permission: {
          id: string
          name: string
          displayName: string
          description?: string | null
          isActive: boolean
        }) => ({
          id: permission.id,
          name: permission.name,
          displayName: permission.displayName,
          description: permission.description ?? null,
          isActive: permission.isActive,
        })
      ) ?? []

    // Transform role to response format
    const roleData = {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: permissionsData,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ROLE_WITH_PERMISSIONS_RETRIEVED,
          roleData
        )
      )
  }
)

/**
 * Get role statistics controller
 * Retrieves role statistics and overview data
 */
export const getRoleStatistics: RequestHandler = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    // Fetch role statistics
    const statistics = await fetchRoleStatistics()

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ROLE_STATISTICS_RETRIEVED,
          statistics
        )
      )
  }
)

/**
 * Update role permissions controller
 * Updates permissions assigned to a role (SuperAdmin only)
 */
export const updateRolePermissionsController: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get validated route parameters (params are validated first, then body overwrites validatedData)
    // So we access req.params['id'] directly since it's already validated
    const roleId = req.params['id'] as string

    // Get body data
    const { permissionIds } = req.body

    // Update role permissions
    const updatedRole = await updateRolePermissions(roleId, permissionIds)

    // Transform permissions to response format
    const permissionsData =
      updatedRole.permissions?.map(
        (permission: {
          id: string
          name: string
          displayName: string
          description?: string | null
          isActive: boolean
        }) => ({
          id: permission.id,
          name: permission.name,
          displayName: permission.displayName,
          description: permission.description ?? null,
          isActive: permission.isActive,
        })
      ) ?? []

    // Transform role to response format
    const roleData = {
      id: updatedRole.id,
      name: updatedRole.name,
      displayName: updatedRole.displayName,
      description: updatedRole.description,
      isActive: updatedRole.isActive,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
      permissions: permissionsData,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.ROLE_PERMISSIONS_UPDATED,
          roleData
        )
      )
  }
)
