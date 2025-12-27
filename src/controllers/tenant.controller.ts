import type { RequestHandler } from 'express'
import { Response } from 'express'

import type {
  RefreshTokenResponseData,
  RolePermission,
  RoleWithPermissions,
} from '@/types/auth.type'
import type { JwtUser } from '@/types/jwt.type'
import type { ExtendedSession } from '@/types/session.type'
import type { TenantListData, TenantListItem } from '@/types/tenant.type'
import { isProduction } from '@config/env'
import logger from '@config/logger'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@constants/audit'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { PAGINATION_DEFAULTS } from '@constants/pagination'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import { User } from '@models/User'
import {
  createRefreshToken,
  revokeRefreshToken,
} from '@queries/refreshToken.queries'
import {
  deleteTenant,
  findTenantById,
  findTenants,
  restoreTenant,
  switchUserTenant,
  updateTenant,
} from '@queries/tenant.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import {
  auditAction,
  auditCreate,
  auditDelete,
  auditUpdate,
  extractRequestContext,
} from '@services/audit.service'
import { onboardTenant } from '@services/tenant.service'
import { ApiError } from '@utils/ApiError'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'
import { signTokens } from '@utils/jwt'

/**
 * Get all tenants controller (for SuperAdmin only)
 * Retrieves all tenants with pagination, sorting, search, and filtering
 * Only SuperAdmin can access this endpoint
 */
export const getAllTenants: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated query parameters
    const filters = (
      req as AuthenticatedRequest & {
        validatedData: Parameters<typeof findTenants>[0]
      }
    ).validatedData

    // Fetch all tenants (no user filtering)
    const { tenants, total } = await findTenants(filters)

    // Transform tenants to list format
    const items: TenantListItem[] = tenants.map((tenant) => {
      const isPrimary = user?.selectedTenantId
        ? tenant.id === user.selectedTenantId
        : false

      return {
        id: tenant.id,
        name: tenant.name,
        isActive: tenant.isActive,
        isPrimary,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      }
    })

    // Build response data
    const data: TenantListData = {
      items,
      pagination: getPaginationMetadata(
        filters.page ?? PAGINATION_DEFAULTS.PAGE_DEFAULT,
        filters.limit ?? PAGINATION_DEFAULTS.LIMIT_DEFAULT,
        total
      ),
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TENANTS_RETRIEVED,
          data
        )
      )
  }
)

/**
 * Get user's tenants controller (for regular users)
 * Retrieves tenants that the authenticated user belongs to, with pagination, sorting, search, and filtering
 */
export const getUserTenants: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated query parameters
    const filters = (
      req as AuthenticatedRequest & {
        validatedData: Parameters<typeof findTenants>[0]
      }
    ).validatedData

    // Fetch tenants filtered by user membership
    const { tenants, total } = await findTenants(filters, user.id)

    // Transform tenants to list format
    const items: TenantListItem[] = tenants.map((tenant) => {
      const isPrimary =
        tenant.id === user.selectedTenantId ||
        tenant.id === user.selectedTenantId

      return {
        id: tenant.id,
        name: tenant.name,
        isActive: tenant.isActive,
        isPrimary,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      }
    })

    // Build response data
    const data: TenantListData = {
      items,
      pagination: getPaginationMetadata(
        filters.page ?? PAGINATION_DEFAULTS.PAGE_DEFAULT,
        filters.limit ?? PAGINATION_DEFAULTS.LIMIT_DEFAULT,
        total
      ),
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TENANTS_RETRIEVED,
          data
        )
      )
  }
)

/**
 * Get tenant by ID controller
 * Retrieves a specific tenant by their ID
 * Only SuperAdmin can access this endpoint
 */
export const getTenantById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get validated params
    const { id } = (
      req as AuthenticatedRequest & {
        params: { id: string }
      }
    ).params

    // Fetch tenant
    const tenant = await findTenantById(id)

    // Prepare tenant response data
    const tenantData = {
      id: tenant.id,
      name: tenant.name,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TENANT_RETRIEVED,
          tenantData
        )
      )
  }
)

/**
 * Create tenant (onboard) controller
 * Creates a new tenant with schema and assigns owner as admin
 * Only SuperAdmin can access this endpoint
 */
export const createTenantController: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get validated body data
    const { name, schemaName } = (
      req as AuthenticatedRequest & {
        body: {
          name: string
          schemaName: string
        }
      }
    ).body

    // Onboard tenant (users will be created separately and associated later)
    const { tenant } = await onboardTenant({
      name,
      schemaName,
    })

    // Audit log
    try {
      const requestContext = extractRequestContext(req)
      // For tenant creation, use the new tenant's ID as tenantId
      await auditCreate(
        AUDIT_ACTIONS.TENANT_CREATED,
        AUDIT_ENTITY_TYPES.TENANT,
        tenant.id,
        {
          requestContext,
          tenantId: tenant.id, // New tenant's ID
          metadata: {
            name: tenant.name,
            schemaName: tenant.schemaName,
          },
        }
      )
    } catch (error) {
      logger.error('Failed to create audit log for tenant creation:', error)
      // Don't fail the request if audit logging fails
    }

    // Prepare tenant response data
    const tenantData = {
      id: tenant.id,
      name: tenant.name,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          SUCCESS_MESSAGES.TENANT_ONBOARDED,
          tenantData
        )
      )
  }
)

/**
 * Update tenant controller
 * Updates tenant information
 * Only SuperAdmin can access this endpoint
 */
export const updateTenantController: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated params and body
    const { id } = (
      req as AuthenticatedRequest & {
        params: { id: string }
      }
    ).params

    const updateData = (
      req as AuthenticatedRequest & {
        body: {
          name?: string
          isActive?: boolean
        }
      }
    ).body

    // Get tenant before update for audit
    const tenantBeforeUpdate = await findTenantById(id)

    // Update tenant
    const updatedTenant = await updateTenant(id, updateData)

    // Track changes for audit
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    if (updateData.name && tenantBeforeUpdate.name !== updatedTenant.name) {
      changes['name'] = {
        from: tenantBeforeUpdate.name,
        to: updatedTenant.name,
      }
    }
    if (
      updateData.isActive !== undefined &&
      tenantBeforeUpdate.isActive !== updatedTenant.isActive
    ) {
      changes['isActive'] = {
        from: tenantBeforeUpdate.isActive,
        to: updatedTenant.isActive,
      }
    }

    // Audit log
    if (Object.keys(changes).length > 0) {
      try {
        const requestContext = extractRequestContext(req)
        const tenantId = user.selectedTenantId
        if (tenantId) {
          await auditUpdate(
            AUDIT_ACTIONS.TENANT_UPDATED,
            AUDIT_ENTITY_TYPES.TENANT,
            id,
            changes,
            {
              requestContext,
              tenantId,
            }
          )
        }
      } catch (error) {
        logger.error('Failed to create audit log for tenant update:', error)
      }
    }

    // Prepare tenant response data
    const tenantData = {
      id: updatedTenant.id,
      name: updatedTenant.name,
      isActive: updatedTenant.isActive,
      createdAt: updatedTenant.createdAt,
      updatedAt: updatedTenant.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TENANT_UPDATED,
          tenantData
        )
      )
  }
)

/**
 * Delete tenant controller
 * Soft deletes a tenant by their ID
 * Only SuperAdmin can access this endpoint
 */
export const deleteTenantById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated params
    const { id } = (
      req as AuthenticatedRequest & {
        params: { id: string }
      }
    ).params

    // Get tenant before deletion for audit
    const tenantToDelete = await findTenantById(id)

    // Delete tenant
    const deletedTenant = await deleteTenant(id)

    // Audit log
    try {
      const requestContext = extractRequestContext(req)
      const tenantId = user.selectedTenantId
      if (tenantId) {
        await auditDelete(
          AUDIT_ACTIONS.TENANT_DELETED,
          AUDIT_ENTITY_TYPES.TENANT,
          id,
          {
            requestContext,
            tenantId,
            metadata: {
              name: tenantToDelete.name,
              schemaName: tenantToDelete.schemaName,
            },
          }
        )
      }
    } catch (error) {
      logger.error('Failed to create audit log for tenant deletion:', error)
    }

    // Prepare tenant response data
    const tenantData = {
      id: deletedTenant.id,
      name: deletedTenant.name,
      isActive: deletedTenant.isActive,
      createdAt: deletedTenant.createdAt,
      updatedAt: deletedTenant.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TENANT_DELETED,
          tenantData
        )
      )
  }
)

/**
 * Restore tenant controller
 * Restores a soft-deleted tenant
 * Only SuperAdmin can access this endpoint
 */
export const restoreTenantById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated params
    const { id } = (
      req as AuthenticatedRequest & {
        params: { id: string }
      }
    ).params

    // Restore tenant
    const restoredTenant = await restoreTenant(id)

    // Audit log
    try {
      const requestContext = extractRequestContext(req)
      const tenantId = user.selectedTenantId
      if (tenantId) {
        await auditAction(
          AUDIT_ACTIONS.TENANT_RESTORED,
          [{ type: AUDIT_ENTITY_TYPES.TENANT, id, name: restoredTenant.name }],
          {
            requestContext,
            tenantId,
          }
        )
      }
    } catch (error) {
      logger.error('Failed to create audit log for tenant restore:', error)
    }

    // Prepare tenant response data
    const tenantData = {
      id: restoredTenant.id,
      name: restoredTenant.name,
      isActive: restoredTenant.isActive,
      createdAt: restoredTenant.createdAt,
      updatedAt: restoredTenant.updatedAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TENANT_RESTORED,
          tenantData
        )
      )
  }
)

/**
 * Switch tenant controller
 * Switches user's primary tenant and updates JWT token with new selectedTenantId
 */
export const switchTenant: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated params
    const { id: tenantId } = (
      req as AuthenticatedRequest & {
        params: { id: string }
      }
    ).params

    // If switching to the same tenant, return early (no need to regenerate tokens)
    if (user.selectedTenantId === tenantId) {
      res.status(HTTP_STATUS.OK).json(
        new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.TENANT_SWITCHED, {
          accessToken: req.headers.authorization?.split(' ')[1] ?? '',
          refreshToken: req.cookies?.['refreshToken'] ?? '',
        })
      )
      return
    }

    // Verify tenant exists and get tenant data
    const switchedTenant = await findTenantById(tenantId)

    // Switch user's primary tenant
    await switchUserTenant(user.id, tenantId)

    // Get user with all relations (roles, permissions)
    // Fetch roles filtered by the selected tenant
    const userWithRelations = await User.query()
      .modify('notDeleted')
      .findById(user.id)
      .withGraphFetched('[roles.[permissions]]')
      .modifyGraph('roles', (builder) => {
        builder
          .where('user_roles.tenant_id', tenantId)
          .modify('notDeleted')
          .modify('active')
      })
      .modifyGraph('roles.permissions', (builder) => {
        builder.modify('notDeleted').modify('active')
      })

    if (!userWithRelations) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Extract roles and permissions
    const roles: RoleWithPermissions[] = userWithRelations.roles ?? []
    const allPermissionsMap = new Map<string, RolePermission>()

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

    // Convert to array of permission names for JWT (keep lightweight)
    const permissionNames = Array.from(allPermissionsMap.keys())

    // Validate and extract primary role for the selected tenant
    const primaryRole = roles[0]

    if (!primaryRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_ROLE
      )
    }

    // Build JWT user payload
    const payload: JwtUser = {
      id: userWithRelations.id,
      name: userWithRelations.name,
      email: userWithRelations.email,
      role: primaryRole.name,
      permissions: permissionNames,
      selectedTenantId: tenantId,
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = signTokens(payload)

    // Get current refresh token from request
    const currentRefreshToken =
      req.cookies?.['refreshToken'] ?? req.headers.authorization?.split(' ')[1]

    // Revoke old refresh token if exists
    if (currentRefreshToken) {
      try {
        await revokeRefreshToken(currentRefreshToken)
      } catch (error) {
        // Ignore errors if token doesn't exist
        logger.warn('Failed to revoke old refresh token:', error)
      }
    }

    // Store new refresh token in database
    await createRefreshToken({
      userId: userWithRelations.id,
      token: newRefreshToken,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    })

    // Update session with new user data
    const session = req.session as ExtendedSession
    if (session) {
      session.user = payload
    }

    // Set tokens in HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction(),
    }

    // Prepare response data
    const responseData: RefreshTokenResponseData = {
      accessToken,
      refreshToken: newRefreshToken,
    }

    // Audit log
    try {
      const requestContext = extractRequestContext(req)
      await auditAction(
        AUDIT_ACTIONS.TENANT_SWITCHED,
        [
          {
            type: AUDIT_ENTITY_TYPES.TENANT,
            id: tenantId,
            name: switchedTenant.name,
          },
        ],
        {
          requestContext,
          tenantId: tenantId,
        }
      )
    } catch (error) {
      logger.error('Failed to create audit log for tenant switch:', error)
    }

    res
      .cookie('refreshToken', newRefreshToken, cookieOptions)
      .cookie('accessToken', accessToken, cookieOptions)
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TENANT_SWITCHED,
          responseData
        )
      )
  }
)
