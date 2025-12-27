import { createHash, randomBytes, randomInt } from 'node:crypto'

import bcrypt from 'bcrypt'
import type { RequestHandler } from 'express'
import { Request, Response } from 'express'

import type {
  LoginResponseData,
  LoginUserData,
  PermissionData,
  RefreshTokenResponseData,
  RoleData,
  RolePermission,
  RoleWithPermissions,
  TenantData,
} from '@/types/auth.type'
import type { JwtUser } from '@/types/jwt.type'
import type { ExtendedSession } from '@/types/session.type'
import { env } from '@config/env'
import logger from '@config/logger'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@constants/audit'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { MFA_TYPE, SECURITY_RULES } from '@constants/security'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import { User } from '@models/User'
import {
  getUserTotpAuthenticator,
  updateAuthenticatorLastUsed,
  updateUserBackupCodes,
} from '@queries/authenticator.queries'
import { createMfaOtp, verifyMfaOtp } from '@queries/mfa.queries'
import {
  createPasswordResetToken,
  findPasswordResetToken,
  revokePasswordResetToken,
} from '@queries/passwordReset.queries'
import {
  createRefreshToken,
  findRefreshTokenByToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
} from '@queries/refreshToken.queries'
import {
  findUserByEmailAndPassword,
  findUserById,
  findUserByIdComplete,
  updateUserMfaStatus,
  updateUserPassword,
  updateUserProfile,
} from '@queries/user.queries'
import { auditAction, extractRequestContext } from '@services/audit.service'
import {
  queueMfaOtpEmail,
  queuePasswordResetEmail,
  queuePasswordResetSuccessEmail,
} from '@services/mailQueue.service'
import { ApiError } from '@utils/ApiError'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'
import { signTokens, verifyRefreshToken } from '@utils/jwt'
import { verifyBackupCode, verifyTotpToken } from '@utils/totp'

/**
 * Login controller
 * Authenticates user with email and password, returns JWT tokens
 */
export const login: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body

    // Validate credentials and get user
    const user = await findUserByEmailAndPassword({ email, password })

    // Check if MFA is enabled for this user
    if (user.mfaEnabled) {
      // Check if user has active TOTP authenticator
      const authenticator = await getUserTotpAuthenticator(user.id)

      if (authenticator?.isActiveAndVerified()) {
        // Return response indicating TOTP is required
        res.status(HTTP_STATUS.OK).json(
          new ApiResponse(HTTP_STATUS.OK, 'TOTP verification required', {
            requiresMfa: true,
            mfaType: MFA_TYPE.TOTP,
            email: user.email,
          })
        )
        return
      }

      // Email OTP flow (existing)
      // Generate 6-digit OTP using cryptographically secure random number
      const otpCode = randomInt(100000, 999999).toString()
      // Store OTP in database
      try {
        await createMfaOtp(
          user.id,
          otpCode,
          SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES,
          req.headers['user-agent'] ?? null,
          req.ip ?? null
        )
      } catch (error) {
        logger.error('Failed to create MFA OTP:', error)
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.MFA_OTP_GENERATION_FAILED
        )
      }

      // Send OTP email via queue
      try {
        await queueMfaOtpEmail({
          to: user.email,
          otpCode,
          expiryMinutes: SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES,
          userName: user.name,
        })
        logger.info(`MFA OTP email queued for ${user.email}`)
      } catch (error) {
        // Log error but don't fail the request (security: don't reveal if email exists)
        logger.error('Failed to queue MFA OTP email:', error)
      }

      // Return response indicating MFA is required
      res.status(HTTP_STATUS.OK).json(
        new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.MFA_OTP_SENT, {
          requiresMfa: true,
          mfaType: MFA_TYPE.EMAIL,
          email: user.email,
        })
      )
      return
    }

    // Get user with all relations (roles, permissions, tenant)
    const userWithRelations = await findUserByIdComplete(user.id)

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

    // Convert to detailed permission objects for response
    const permissionsData = Array.from(allPermissionsMap.values()).map(
      (permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
      })
    )

    // Validate and extract primary role
    const primaryRole = roles[0]
    if (!primaryRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_ROLE
      )
    }

    // Get all tenants with is_primary flag
    const tenants = userWithRelations.tenants ?? []
    const primaryTenant =
      tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0]

    if (!primaryTenant) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_TENANT
      )
    }

    // Extract role data
    const roleData: RoleData = {
      id: primaryRole.id,
      name: primaryRole.name,
      displayName: primaryRole.displayName,
    }

    // Extract all tenants data with isPrimary flag
    const tenantsData: TenantData[] = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      isPrimary: tenant.userTenants?.isPrimary === true,
    }))

    // Build JWT user payload
    const payload: JwtUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: primaryRole.name,
      permissions: permissionNames,
      selectedTenantId: primaryTenant.id,
    }

    // Generate tokens
    const { accessToken, refreshToken } = signTokens(payload)

    // Store refresh token in database
    await createRefreshToken({
      userId: user.id,
      token: refreshToken,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    })

    // Store user session data in session store
    // This will automatically save the session to the database via connect-session-knex
    // Modifying req.session automatically triggers a save when resave: false
    const session = req.session as ExtendedSession
    session.user = payload

    // Set tokens in HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    }

    // Prepare user response data (exclude sensitive fields)
    const userData: LoginUserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleData,
      permissions: permissionsData,
      tenants: tenantsData,
      selectedTenantId: primaryTenant.id,
    }

    // Prepare login response data
    const responseData: LoginResponseData = {
      accessToken,
      refreshToken,
      user: userData,
    }

    // Audit log for login
    try {
      const requestContext = extractRequestContext(req)
      await auditAction(
        AUDIT_ACTIONS.USER_LOGGED_IN,
        [
          {
            type: AUDIT_ENTITY_TYPES.USER,
            id: user.id,
            name: user.name,
          },
        ],
        {
          requestContext,
          tenantId: primaryTenant.id,
          actor: {
            type: 'user',
            id: user.id,
            email: user.email,
            name: user.name,
          },
        }
      )
    } catch (error) {
      logger.error('Failed to create audit log for user login:', error)
      // Don't fail the request if audit logging fails
    }

    res
      .cookie('refreshToken', refreshToken, cookieOptions)
      .cookie('accessToken', accessToken, cookieOptions)
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.LOGIN_SUCCESSFUL,
          responseData
        )
      )
  }
)

/**
 * Refresh token controller
 * Renews access token and refresh token using a valid refresh token
 */
export const refreshToken: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // Get refresh token from cookie or request body
    const refreshTokenFromRequest =
      req.cookies?.['refreshToken'] ?? req.body?.['refreshToken']

    if (!refreshTokenFromRequest) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED
      )
    }

    // Verify refresh token JWT
    let tokenPayload
    try {
      tokenPayload = await verifyRefreshToken(refreshTokenFromRequest)
    } catch {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN)
    }

    // Check if refresh token exists in database and is valid
    const storedRefreshToken = await findRefreshTokenByToken(
      refreshTokenFromRequest
    )

    if (!storedRefreshToken) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN)
    }

    // Get user with all relations (roles, permissions, tenant)
    const userWithRelations = await findUserByIdComplete(tokenPayload.id)

    // Extract roles and permissions
    const roles: RoleWithPermissions[] = userWithRelations.roles ?? []
    const allPermissions = new Set<string>()

    roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          // Only include active, non-deleted permissions
          if (permission.isActive && !permission.deletedAt) {
            allPermissions.add(permission.name)
          }
        })
      }
    })

    // Validate and extract primary role
    const primaryRole = roles[0]
    if (!primaryRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_ROLE
      )
    }

    // Get all tenants with is_primary flag
    const tenants = userWithRelations.tenants ?? []
    const primaryTenant =
      tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0]

    if (!primaryTenant) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_TENANT
      )
    }

    // Build JWT user payload
    const payload: JwtUser = {
      id: userWithRelations.id,
      name: userWithRelations.name,
      email: userWithRelations.email,
      role: primaryRole.name,
      permissions: Array.from(allPermissions),
      selectedTenantId: primaryTenant.id,
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = signTokens(payload)

    // Revoke old refresh token
    await revokeRefreshToken(refreshTokenFromRequest)

    // Store new refresh token in database
    await createRefreshToken({
      userId: userWithRelations.id,
      token: newRefreshToken,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    })

    // Update session with new user data
    const session = req.session as ExtendedSession
    session.user = payload

    // Set tokens in HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    }

    // Prepare refresh token response data
    const responseData: RefreshTokenResponseData = {
      accessToken,
      refreshToken: newRefreshToken,
    }

    res
      .cookie('refreshToken', newRefreshToken, cookieOptions)
      .cookie('accessToken', accessToken, cookieOptions)
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.TOKEN_REFRESHED,
          responseData
        )
      )
  }
)

/**
 * Logout controller
 * Revokes refresh token and clears authentication cookies
 */
export const logout: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Clear authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    }

    // Revoke all refresh tokens for the user (logout from all devices)
    if (user) {
      await revokeAllRefreshTokensForUser(user.id)

      // Audit log for logout
      try {
        const requestContext = extractRequestContext(req)
        const tenantId = user.selectedTenantId
        if (tenantId) {
          await auditAction(
            AUDIT_ACTIONS.USER_LOGGED_OUT,
            [
              {
                type: AUDIT_ENTITY_TYPES.USER,
                id: user.id,
                name: user.name,
              },
            ],
            {
              requestContext,
              tenantId,
              actor: {
                type: 'user',
                id: user.id,
                email: user.email,
              },
            }
          )
        }
      } catch (error) {
        logger.error('Failed to create audit log for user logout:', error)
        // Don't fail the request if audit logging fails
      }
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session:', err)
      }
    })

    res
      .clearCookie('refreshToken', cookieOptions)
      .clearCookie('accessToken', cookieOptions)
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGOUT_SUCCESSFUL, {})
      )
  }
)

/**
 * Forgot password controller
 * Generates a secure token and stores it for password reset
 */
export const forgotPassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body

    // Find user by email
    const user = await User.findByEmail(email)

    // Always return success to prevent email enumeration
    // Don't reveal if email exists or not
    if (!user) {
      res
        .status(HTTP_STATUS.OK)
        .json(
          new ApiResponse(
            HTTP_STATUS.OK,
            SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
            {}
          )
        )
      return
    }

    // Generate secure random token using crypto
    const plainToken = randomBytes(32).toString('hex')

    // Hash the token using SHA-256 before storing
    const hashedToken = createHash('sha256').update(plainToken).digest('hex')

    // Store password reset token (hashed version)
    await createPasswordResetToken({
      email: user.email,
      token: hashedToken,
      expiresInMinutes: SECURITY_RULES.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
    })

    // Send password reset email via queue
    try {
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${plainToken}&email=${encodeURIComponent(user.email)}`
      await queuePasswordResetEmail({
        to: user.email,
        resetUrl,
        expiryMinutes: SECURITY_RULES.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
        userName: user.name,
      })
      logger.info(`Password reset email queued for ${user.email}`)
    } catch (error) {
      // Log error but don't fail the request (security: don't reveal if email exists)
      logger.error('Failed to queue password reset email:', error)
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
          {}
        )
      )
  }
)

/**
 * Reset password controller
 * Validates token and updates user password
 */
export const resetPassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, token, password } = req.body

    // Find user by email
    const user = await User.findByEmail(email)

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = createHash('sha256').update(token).digest('hex')

    // Find password reset token (compare hashed tokens)
    const passwordReset = await findPasswordResetToken(email, hashedToken)

    if (!passwordReset) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_RESET_TOKEN
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10)

    // Update user password
    await updateUserPassword(user.id, passwordHash)

    // Revoke the used password reset token (use hashed token)
    await revokePasswordResetToken(hashedToken)

    // Send password reset success email via queue
    try {
      const loginUrl = `${env.FRONTEND_URL}/login`
      await queuePasswordResetSuccessEmail({
        to: user.email,
        userName: user.name,
        loginUrl,
      })
      logger.info(`Password reset success email queued for ${user.email}`)
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to queue password reset success email:', error)
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESSFUL,
          {}
        )
      )
  }
)

/**
 * Change password controller
 * Updates user password after verifying current password
 */
export const changePassword: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated body data
    const { currentPassword, newPassword } = (
      req as AuthenticatedRequest & {
        validatedData: {
          currentPassword: string
          newPassword: string
        }
      }
    ).validatedData

    // Find user by ID
    const userDetails = await User.query()
      .modify('notDeleted')
      .findById(user.id)

    if (!userDetails) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      userDetails.passwordHash
    )

    if (!isPasswordValid) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update user password
    await updateUserPassword(user.id, passwordHash)

    // Send password change success email via queue
    try {
      const loginUrl = `${env.FRONTEND_URL}/login`
      await queuePasswordResetSuccessEmail({
        to: userDetails.email,
        userName: userDetails.name,
        loginUrl,
      })
      logger.info(
        `Password change success email queued for ${userDetails.email}`
      )
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to queue password change success email:', error)
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSWORD_CHANGED, {})
      )
  }
)

/**
 * Get user profile controller
 * Retrieves the current authenticated user's complete information
 */
export const getProfile: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get user with all relations (roles, permissions, tenant)
    const userWithRelations = await findUserByIdComplete(user.id)

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

    // Convert to detailed permission objects for response
    const permissionsData: PermissionData[] = Array.from(
      allPermissionsMap.values()
    ).map((permission) => ({
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
    }))

    // Validate and extract primary role
    const primaryRole = roles[0]
    if (!primaryRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_ROLE
      )
    }

    // Get all tenants with is_primary flag
    const tenants = userWithRelations.tenants ?? []
    const primaryTenant =
      tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0]

    if (!primaryTenant) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_TENANT
      )
    }

    // Extract role data
    const roleData: RoleData = {
      id: primaryRole.id,
      name: primaryRole.name,
      displayName: primaryRole.displayName,
    }

    // Extract all tenants data with isPrimary flag
    const tenantsData: TenantData[] = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      isPrimary: tenant.userTenants?.isPrimary === true,
    }))

    // Prepare user response data (exclude sensitive fields)
    const userData: LoginUserData = {
      id: userWithRelations.id,
      email: userWithRelations.email,
      name: userWithRelations.name,
      role: roleData,
      permissions: permissionsData,
      tenants: tenantsData,
      selectedTenantId: primaryTenant.id,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.USER_PROFILE_RETRIEVED,
          userData
        )
      )
  }
)

/**
 * Update user profile controller
 * Updates the current authenticated user's profile information
 */
export const updateProfile: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated body data
    const { name } = (
      req as AuthenticatedRequest & {
        validatedData: { name: string }
      }
    ).validatedData

    // Update user profile (only name can be updated)
    const updatedUser = await updateUserProfile(user.id, { name })

    // Get updated user with all relations (roles, permissions, tenant)
    const userWithRelations = await findUserByIdComplete(updatedUser.id)

    // Extract roles and permissions
    const roles: RoleWithPermissions[] = userWithRelations.roles ?? []
    const allPermissionsMap = new Map<string, RolePermission>()

    roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          // Only include active, non-deleted permissions
          // Use Map to avoid duplicates (same permission from multiple roles)
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

    // Validate and extract primary role
    const primaryRole = roles[0]
    if (!primaryRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_ROLE
      )
    }

    // Get all tenants with is_primary flag
    const tenants = userWithRelations.tenants ?? []
    const primaryTenant =
      tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0]

    if (!primaryTenant) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_TENANT
      )
    }

    // Extract role data
    const roleData: RoleData = {
      id: primaryRole.id,
      name: primaryRole.name,
      displayName: primaryRole.displayName,
    }

    // Extract all tenants data with isPrimary flag
    const tenantsData: TenantData[] = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      isPrimary: tenant.userTenants?.isPrimary === true,
    }))

    // Prepare user response data (exclude sensitive fields)
    const userData: LoginUserData = {
      id: userWithRelations.id,
      email: userWithRelations.email,
      name: userWithRelations.name,
      role: roleData,
      permissions: permissionsData,
      tenants: tenantsData,
      selectedTenantId: primaryTenant.id,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.USER_PROFILE_UPDATED,
          userData
        )
      )
  }
)

/**
 * MFA verify controller
 * Verifies OTP and completes login for users with MFA enabled
 */
export const verifyMfa: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, code } = req.body

    // Find user by email
    const user = await User.findByEmail(email)

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Check if user has MFA enabled
    if (!user.mfaEnabled) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_NOT_ENABLED
      )
    }

    // Verify OTP
    await verifyMfaOtp(user.id, code)

    // Get user with all relations (roles, permissions, tenant)
    const userWithRelations = await findUserByIdComplete(user.id)

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

    // Convert to detailed permission objects for response
    const permissionsData = Array.from(allPermissionsMap.values()).map(
      (permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
      })
    )

    // Validate and extract primary role
    const primaryRole = roles[0]
    if (!primaryRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_ROLE
      )
    }

    // Get all tenants with is_primary flag
    const tenants = userWithRelations.tenants ?? []
    const primaryTenant =
      tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0]

    if (!primaryTenant) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_TENANT
      )
    }

    // Extract role data
    const roleData: RoleData = {
      id: primaryRole.id,
      name: primaryRole.name,
      displayName: primaryRole.displayName,
    }

    // Extract all tenants data with isPrimary flag
    const tenantsData: TenantData[] = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      isPrimary: tenant.userTenants?.isPrimary === true,
    }))

    // Build JWT user payload
    const payload: JwtUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: primaryRole.name,
      permissions: permissionNames,
      selectedTenantId: primaryTenant.id,
    }

    // Generate tokens
    const { accessToken, refreshToken } = signTokens(payload)

    // Store refresh token in database
    await createRefreshToken({
      userId: user.id,
      token: refreshToken,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    })

    // Store user session data in session store (includes tenants for quick access)
    const session = req.session as ExtendedSession
    session.user = payload

    // Set tokens in HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    }

    // Prepare user response data (exclude sensitive fields)
    const userData: LoginUserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleData,
      permissions: permissionsData,
      tenants: tenantsData,
      selectedTenantId: primaryTenant.id,
    }

    // Prepare login response data
    const responseData: LoginResponseData = {
      accessToken,
      refreshToken,
      user: userData,
    }

    // Audit log for login (MFA OTP)
    try {
      const requestContext = extractRequestContext(req)
      await auditAction(
        AUDIT_ACTIONS.USER_LOGGED_IN,
        [
          {
            type: AUDIT_ENTITY_TYPES.USER,
            id: user.id,
            name: user.name,
          },
        ],
        {
          requestContext,
          tenantId: primaryTenant.id,
          actor: {
            type: 'user',
            id: user.id,
            email: user.email,
            name: user.name,
          },
        }
      )
    } catch (error) {
      logger.error(
        'Failed to create audit log for user login (MFA OTP):',
        error
      )
      // Don't fail the request if audit logging fails
    }

    res
      .cookie('refreshToken', refreshToken, cookieOptions)
      .cookie('accessToken', accessToken, cookieOptions)
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.MFA_VERIFIED,
          responseData
        )
      )
  }
)

/**
 * Enable email OTP MFA controller
 * Enables email-based OTP for the authenticated user
 */
export const enableMfa: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Update MFA status to enabled
    const updatedUser = await updateUserMfaStatus(user.id, true)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.MFA_ENABLED, {
        mfaEnabled: updatedUser.mfaEnabled,
      })
    )
  }
)

/**
 * Disable email OTP MFA controller
 * Disables email-based OTP for the authenticated user
 */
export const disableMfa: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Update MFA status to disabled
    const updatedUser = await updateUserMfaStatus(user.id, false)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.MFA_DISABLED, {
        mfaEnabled: updatedUser.mfaEnabled,
      })
    )
  }
)

/**
 * Get MFA status controller
 * Retrieves the current MFA status for the authenticated user
 */
export const getMfaStatus: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get user with MFA status
    const userWithMfa = await findUserById(user.id)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.MFA_STATUS_RETRIEVED, {
        mfaEnabled: userWithMfa.mfaEnabled,
      })
    )
  }
)

/**
 * Verify TOTP code controller (for login)
 * Verifies TOTP code or backup code and completes login
 */
export const verifyTotp: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, code, isBackupCode } = req.body

    // Find user by email
    const user = await User.findByEmail(email)

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Check if user has MFA enabled
    if (!user.mfaEnabled) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_NOT_ENABLED
      )
    }

    // Get user's active authenticator
    const authenticator = await getUserTotpAuthenticator(user.id)

    if (!authenticator?.isActiveAndVerified()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED
      )
    }

    let isValid = false

    // Verify backup code if specified
    if (isBackupCode) {
      if (!authenticator.backupCodes) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID
        )
      }

      const { isValid: backupCodeValid, updatedCodes } = verifyBackupCode(
        code,
        authenticator.backupCodes
      )

      if (!backupCodeValid) {
        throw new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID
        )
      }

      // Update backup codes (remove used code)
      await updateUserBackupCodes(user.id, updatedCodes)
      isValid = true
    } else {
      // Verify TOTP code
      isValid = verifyTotpToken(code, authenticator.secret)

      if (!isValid) {
        throw new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_MESSAGES.MFA_TOTP_INVALID
        )
      }
    }

    // Update last used timestamp
    if (isValid) {
      await updateAuthenticatorLastUsed(authenticator.id)
    }

    // Get user with all relations (roles, permissions, tenant)
    const userWithRelations = await findUserByIdComplete(user.id)

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

    // Convert to detailed permission objects for response
    const permissionsData = Array.from(allPermissionsMap.values()).map(
      (permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
      })
    )

    // Validate and extract primary role
    const primaryRole = roles[0]
    if (!primaryRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_ROLE
      )
    }

    // Get all tenants with is_primary flag
    const tenants = userWithRelations.tenants ?? []
    const primaryTenant =
      tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0]

    if (!primaryTenant) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.USER_NO_TENANT
      )
    }

    // Extract role data
    const roleData: RoleData = {
      id: primaryRole.id,
      name: primaryRole.name,
      displayName: primaryRole.displayName,
    }

    // Extract all tenants data with isPrimary flag
    const tenantsData: TenantData[] = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      isPrimary: tenant.userTenants?.isPrimary === true,
    }))

    // Build JWT user payload
    const payload: JwtUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: primaryRole.name,
      permissions: permissionNames,
      selectedTenantId: primaryTenant.id,
    }

    // Generate tokens
    const { accessToken, refreshToken } = signTokens(payload)

    // Store refresh token in database
    await createRefreshToken({
      userId: user.id,
      token: refreshToken,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    })

    // Store user session data in session store (includes tenants for quick access)
    const session = req.session as ExtendedSession
    session.user = payload

    // Set tokens in HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    }

    // Prepare user response data (exclude sensitive fields)
    const userData: LoginUserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleData,
      permissions: permissionsData,
      tenants: tenantsData,
      selectedTenantId: primaryTenant.id,
    }

    // Prepare login response data
    const responseData: LoginResponseData = {
      accessToken,
      refreshToken,
      user: userData,
    }

    // Audit log for login (TOTP)
    try {
      const requestContext = extractRequestContext(req)
      await auditAction(
        AUDIT_ACTIONS.USER_LOGGED_IN,
        [
          {
            type: AUDIT_ENTITY_TYPES.USER,
            id: user.id,
            name: user.name,
          },
        ],
        {
          requestContext,
          tenantId: primaryTenant.id,
          actor: {
            type: 'user',
            id: user.id,
            email: user.email,
            name: user.name,
          },
        }
      )
    } catch (error) {
      logger.error('Failed to create audit log for user login (TOTP):', error)
      // Don't fail the request if audit logging fails
    }

    res
      .cookie('refreshToken', refreshToken, cookieOptions)
      .cookie('accessToken', accessToken, cookieOptions)
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.MFA_VERIFIED,
          responseData
        )
      )
  }
)
