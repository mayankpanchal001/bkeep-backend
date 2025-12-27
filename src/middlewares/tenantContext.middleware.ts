import type { NextFunction, Response } from 'express'

import logger from '@config/logger'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { findTenantById } from '@queries/tenant.queries'
import { ApiError } from '@utils/ApiError'

import type { AuthenticatedRequest } from './auth.middleware'

/**
 * Tenant context interface
 * Contains tenant information
 */
export interface TenantContext {
  tenantId: string
  tenantName: string
  schemaName: string
}

/**
 * Extended Request interface with tenant context
 */
export interface TenantRequest extends AuthenticatedRequest {
  tenantContext?: TenantContext
}

/**
 * Set tenant context middleware
 * Extracts tenant information from authenticated user and sets tenant context
 * The tenant context includes tenant ID, name, and schema name
 *
 * @param req - Express request object (extended with user and tenantContext properties)
 * @param _res - Express response object (unused)
 * @param next - Express next function
 *
 * @example
 * // Use in routes that need tenant context
 * router.get('/accounts', authenticate, setTenantContext, getAccounts)
 *
 * @remarks
 * - Requires authentication middleware to run first
 * - Gets tenantId from req.user.selectedTenantId (from JWT token)
 * - Fetches tenant from database and verifies it's active
 * - Sets req.tenantContext with tenant information
 * - If user doesn't have tenantId or tenant is inactive, continues without context
 * - Uses shared database connection pool (no new connections created)
 */
export const setTenantContext = async (
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      // User not authenticated, continue without tenant context
      return next()
    }

    // Get tenantId from JWT user
    if (!user.selectedTenantId) {
      // User doesn't have a tenant assigned, continue without tenant context
      return next()
    }

    // Fetch tenant from database
    const tenant = await findTenantById(user.selectedTenantId)

    if (!tenant?.isActive) {
      // Tenant is inactive or doesn't exist, continue without tenant context
      return next()
    }

    // Set tenant context
    req.tenantContext = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      schemaName: tenant.schemaName,
    }

    next()
  } catch (error) {
    // Log error but don't fail the request
    // This allows routes that don't require tenant context to continue
    logger.error('Error setting tenant context:', error)
    next()
  }
}

/**
 * Require tenant context middleware
 * Ensures that tenant context is set before proceeding
 * Returns 403 Forbidden if tenant context is not available
 *
 * @param req - Express request object (extended with tenantContext property)
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * // Use in routes that require tenant context
 * router.get('/accounts', authenticate, setTenantContext, requireTenantContext, getAccounts)
 *
 * @throws {ApiError} 403 Forbidden if tenant context is not set
 */
export const requireTenantContext = (
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.tenantContext) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
    )
  }
  next()
}

/**
 * Get tenant context from request
 * Helper function to extract tenant context from request object
 *
 * @param req - Express request object (extended with tenantContext property)
 * @returns Tenant context or undefined
 *
 * @example
 * // In a controller
 * const tenantContext = getTenantContext(req)
 * if (tenantContext) {
 *   // Use withTenantSchema() utility for queries
 *   const accounts = await withTenantSchema(tenantContext.schemaName, async (knex) => {
 *     return await Account.query(knex).where('is_active', true)
 *   })
 * }
 */
export const getTenantContext = (
  req: TenantRequest
): TenantContext | undefined => {
  return req.tenantContext
}
