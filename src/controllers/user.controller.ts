import type { RequestHandler } from 'express'
import { Response } from 'express'

import type {
  PermissionData,
  RoleData,
  RolePermission,
  RoleWithPermissions,
} from '@/types/auth.type'
import type { JwtUser } from '@/types/jwt.type'
import type { UserListData, UserListItem } from '@/types/user.type'
import logger from '@config/logger'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@constants/audit'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import {
  deleteUser,
  getUserStatistics as fetchUserStatistics,
  findUserById,
  findUsers,
  restoreUser,
  updateUserActivationStatus,
  updateUserRoles,
} from '@queries/user.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import {
  auditDelete,
  auditUpdate,
  extractRequestContext,
} from '@services/audit.service'
import { ApiError } from '@utils/ApiError'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all users controller
 * Retrieves users with pagination, sorting, search, and filtering
 * All users are filtered by the authenticated user's selected tenant
 */
export const getAllUsers: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated query parameters
    const filters = (
      req as AuthenticatedRequest & {
        validatedData: Parameters<typeof findUsers>[0]
      }
    ).validatedData

    // Filter by selected tenant (tenant context required)
    const tenantId = user.selectedTenantId

    if (!tenantId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
      )
    }

    // Fetch users with filters (exclude the requesting user)
    const { users, total } = await findUsers(
      filters,
      tenantId,
      user.role,
      user.id
    )

    // Transform users to response format (exclude sensitive fields)
    const usersData: UserListItem[] = users.map((user) => {
      // Extract roles and permissions
      const roles: RoleWithPermissions[] = user.roles ?? []
      const allPermissionsMap = new Map<string, RolePermission>()

      // Get primary role (first role)
      const primaryRole = roles[0]

      roles.forEach((role) => {
        if (role.permissions) {
          role.permissions.forEach((permission) => {
            // Only include active, non-deleted permissions
            if (permission.isActive && !permission.deletedAt) {
              if (!allPermissionsMap.has(permission.name)) {
                allPermissionsMap.set(permission.name, permission)
              }
            }
          })
        }
      })

      // Convert to detailed permission objects for response
      const permissionsData: PermissionData[] = Array.from(
        allPermissionsMap.values()
      ).map((permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
      }))

      // Extract primary role data
      const roleData: RoleData = primaryRole
        ? {
            id: primaryRole.id,
            name: primaryRole.name,
            displayName: primaryRole.displayName,
          }
        : { id: '', name: '', displayName: '' }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt ?? null,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
        lastLoggedInAt: user.lastLoggedInAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: roleData,
        permissions: permissionsData,
      }
    })

    // Get pagination metadata
    const pagination = getPaginationMetadata(filters.page, filters.limit, total)

    // Prepare response data
    const responseData: UserListData = {
      items: usersData,
      pagination,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.USERS_RETRIEVED,
          responseData
        )
      )
  }
)

/**
 * Get user by ID controller
 * Retrieves a specific user by their ID (SuperAdmin only)
 */
export const getUserById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string

    // Fetch user by ID with all relations
    const user = await findUserById(id)

    // Extract roles and permissions
    const roles: RoleWithPermissions[] = user.roles ?? []
    const allPermissionsMap = new Map<string, RolePermission>()

    // Get primary role (first role)
    const primaryRole = roles[0]

    roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          // Only include active, non-deleted permissions
          if (permission.isActive && !permission.deletedAt) {
            if (!allPermissionsMap.has(permission.name)) {
              allPermissionsMap.set(permission.name, permission)
            }
          }
        })
      }
    })

    // Convert to detailed permission objects for response
    const permissionsData: PermissionData[] = Array.from(
      allPermissionsMap.values()
    ).map((permission) => ({
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
    }))

    // Extract primary role data
    const roleData: RoleData = primaryRole
      ? {
          id: primaryRole.id,
          name: primaryRole.name,
          displayName: primaryRole.displayName,
        }
      : { id: '', name: '', displayName: '' }

    // Transform user to response format (exclude sensitive fields)
    const userData: UserListItem = {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      verifiedAt: user.verifiedAt ?? null,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLoggedInAt: user.lastLoggedInAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: roleData,
      permissions: permissionsData,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.USER_RETRIEVED,
          userData
        )
      )
  }
)

/**
 * Get user statistics controller
 * Retrieves user statistics and overview data
 * Statistics are filtered by the user's selected tenant
 */
export const getUserStatistics: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    if (!user.selectedTenantId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
      )
    }

    // Fetch user statistics filtered by selected tenant
    const statistics = await fetchUserStatistics(user.selectedTenantId)

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.USER_STATISTICS_RETRIEVED,
          statistics
        )
      )
  }
)

/**
 * Delete user controller
 * Soft deletes a user by their ID (SuperAdmin only)
 */
export const deleteUserById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string
    const requestContext = extractRequestContext(req)
    const tenantId = req.user?.selectedTenantId

    // Get user before deletion for audit
    const userToDelete = await findUserById(id)

    // Delete user (soft delete)
    await deleteUser(id)

    // Audit log
    try {
      await auditDelete(
        AUDIT_ACTIONS.USER_DELETED,
        AUDIT_ENTITY_TYPES.USER,
        id,
        {
          requestContext,
          tenantId: tenantId ?? '',
          metadata: {
            email: userToDelete.email,
            name: userToDelete.name,
          },
        }
      )
    } catch (error) {
      logger.error('Failed to create audit log for user deletion:', error)
    }

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.USER_DELETED, {}))
  }
)

/**
 * Update user activation status controller
 * Activates or deactivates a user account (SuperAdmin only)
 */
export const updateUserActivation: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['id'] as string
    const { isActive } = req.body
    const requestContext = extractRequestContext(req)
    const tenantId = req.user?.selectedTenantId

    // Get user before update for audit
    const userBeforeUpdate = await findUserById(userId)

    const updatedUser = await updateUserActivationStatus(userId, isActive)

    // Audit log
    try {
      await auditUpdate(
        isActive
          ? AUDIT_ACTIONS.USER_ACTIVATED
          : AUDIT_ACTIONS.USER_DEACTIVATED,
        AUDIT_ENTITY_TYPES.USER,
        userId,
        {
          isActive: { from: userBeforeUpdate.isActive, to: isActive },
        },
        {
          requestContext,
          tenantId: tenantId ?? '',
        }
      )
    } catch (error) {
      logger.error('Failed to create audit log for user activation:', error)
      // Don't fail the request if audit logging fails
    }

    const message = isActive
      ? SUCCESS_MESSAGES.USER_ACTIVATED
      : SUCCESS_MESSAGES.USER_DEACTIVATED

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, message, {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isActive: updatedUser.isActive,
      })
    )
  }
)

/**
 * Restore user controller
 * Restores a soft-deleted user by their ID (SuperAdmin only)
 */
export const restoreUserById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params['id'] as string

    // Restore user (un-delete)
    const restoredUser = await restoreUser(id)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.USER_RESTORED, {
        id: restoredUser.id,
        email: restoredUser.email,
        name: restoredUser.name,
        isActive: restoredUser.isActive,
        deletedAt: restoredUser.deletedAt,
      })
    )
  }
)

/**
 * Update user roles controller
 * Updates roles assigned to a user (SuperAdmin and Admin only)
 */
export const updateUserRolesController: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params['id'] as string

    // Get body data
    const { roleIds } = req.body

    // Update user roles
    const updatedUser = await updateUserRoles(userId, roleIds)

    // Extract roles and permissions
    const roles: RoleWithPermissions[] = updatedUser.roles ?? []
    const allPermissionsMap = new Map<string, RolePermission>()

    // Get primary role (first role)
    const primaryRole = roles[0]

    roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          // Only include active, non-deleted permissions
          if (permission.isActive && !permission.deletedAt) {
            if (!allPermissionsMap.has(permission.name)) {
              allPermissionsMap.set(permission.name, permission)
            }
          }
        })
      }
    })

    // Convert to detailed permission objects for response
    const permissionsData: PermissionData[] = Array.from(
      allPermissionsMap.values()
    ).map((permission) => ({
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
    }))

    // Extract primary role data
    const roleData: RoleData = primaryRole
      ? {
          id: primaryRole.id,
          name: primaryRole.name,
          displayName: primaryRole.displayName,
        }
      : { id: '', name: '', displayName: '' } // Fallback (should not happen)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.USER_ROLES_UPDATED, {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: roleData,
        permissions: permissionsData,
      })
    )
  }
)
