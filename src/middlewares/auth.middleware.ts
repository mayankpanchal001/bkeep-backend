import type { NextFunction, Request, RequestHandler, Response } from 'express'

import type { AuthorizeOptions } from '@/types/auth.type'
import type { JwtUser } from '@/types/jwt.type'
import { env } from '@config/env'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { ApiError } from '@utils/ApiError'
import { verifyToken } from '@utils/jwt'

/**
 * Token cache interface
 */
interface CachedToken {
  user: JwtUser
  exp: number
}

/**
 * Token cache using Map
 * Key: token string
 * Value: { user, exp }
 */
const cache = new Map<string, CachedToken>()

/**
 * Extended Request interface with user
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtUser
}

/**
 * Authentication middleware
 * Verifies JWT access token from Authorization header and attaches user to request
 * Uses token caching for improved performance
 *
 * @param req - Express request object (extended with user property)
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} 401 Unauthorized if token is missing or invalid
 *
 * @example
 * // Protect a route with authentication
 * router.get('/profile', authenticate, getProfile)
 *
 * @example
 * // Token format in Authorization header
 * // Authorization: Bearer <access_token>
 *
 * @remarks
 * - Token is extracted from `Authorization` header in format: `Bearer <token>`
 * - Valid tokens are cached in memory for performance
 * - Cached tokens are automatically invalidated when expired
 * - User data is attached to `req.user` for use in subsequent middleware/handlers
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]

  if (!token) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.USER_NOT_AUTHENTICATED
    )
  }

  if (cache.has(token)) {
    const now = Date.now() / 1000
    const cached = cache.get(token)

    if (cached && cached.exp > now) {
      req.user = cached.user
      return next()
    }

    cache.delete(token)
  }

  const decoded = await verifyToken(token, env.ACCESS_TOKEN_SECRET)
  cache.set(token, { user: decoded.user, exp: decoded.exp ?? 0 })
  req.user = decoded.user
  next()
}

/**
 * Authorize middleware factory
 * Checks if the authenticated user has the required roles and/or permissions
 *
 * @param options - Authorization options (roles, permissions, etc.)
 * @returns Express middleware function
 *
 * @example
 * // Require specific role
 * router.get('/admin', authenticate, authorize({ roles: ['admin'] }), handler)
 *
 * @example
 * // Require specific permission
 * router.get('/users', authenticate, authorize({ permissions: ['view_users'] }), handler)
 *
 * @example
 * // Require role OR permission
 * router.get('/data', authenticate, authorize({ roles: ['admin'], permissions: ['view_data'] }), handler)
 *
 * @example
 * // Require role AND permission
 * router.get('/sensitive', authenticate, authorize({ roles: ['admin'], permissions: ['manage_users'], requireBoth: true }), handler)
 *
 * @example
 * // Require ALL permissions (AND logic)
 * router.get('/complex', authenticate, authorize({ permissions: ['view_users', 'edit_users'], requireAllPermissions: true }), handler)
 */
export const authorize = (options: AuthorizeOptions = {}): RequestHandler => {
  const {
    roles = [],
    permissions = [],
    requireAllPermissions = false,
    requireBoth = false,
  } = options

  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const user = req.user

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.USER_NOT_AUTHENTICATED
      )
    }

    // If no roles or permissions specified, allow access (just authentication check)
    if (roles.length === 0 && permissions.length === 0) {
      return next()
    }

    let hasRole = false
    let hasPermission = false

    // Check roles
    if (roles.length > 0) {
      hasRole = roles.includes(user.role)
    }

    // Check permissions
    if (permissions.length > 0) {
      if (requireAllPermissions) {
        // User must have ALL specified permissions
        hasPermission = permissions.every((permission) =>
          user.permissions.includes(permission)
        )
      } else {
        // User needs at least ONE permission
        hasPermission = permissions.some((permission) =>
          user.permissions.includes(permission)
        )
      }
    }

    // Determine authorization result
    let isAuthorized = false

    if (requireBoth) {
      // User must have BOTH role AND permissions
      if (roles.length > 0 && permissions.length > 0) {
        isAuthorized = hasRole && hasPermission
      } else if (roles.length > 0) {
        isAuthorized = hasRole
      } else if (permissions.length > 0) {
        isAuthorized = hasPermission
      }
    } else {
      // User needs EITHER role OR permissions
      if (roles.length > 0 && permissions.length > 0) {
        isAuthorized = hasRole || hasPermission
      } else if (roles.length > 0) {
        isAuthorized = hasRole
      } else if (permissions.length > 0) {
        isAuthorized = hasPermission
      }
    }

    if (!isAuthorized) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.UNAUTHORIZED_ACCESS
      )
    }

    next()
  }
}
