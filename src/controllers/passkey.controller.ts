/**
 * Passkey Controller
 * Handles WebAuthn/FIDO2 passkey authentication operations
 */

import type { RequestHandler } from 'express'
import { Request, Response } from 'express'

import type {
  LoginResponseData,
  PermissionData,
  RoleData,
  RolePermission,
  RoleWithPermissions,
  TenantData,
} from '@/types/auth.type'
import type { JwtUser } from '@/types/jwt.type'
import type {
  CreatePasskeyData,
  PasskeyCredentialType,
  StoredChallenge,
} from '@/types/passkey.type'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import { User } from '@models/User'
import {
  activatePasskey,
  createPasskey,
  deactivatePasskey,
  deletePasskey,
  findPasskeyByCredentialId,
  findPasskeyById,
  findPasskeysByUserId,
  getPasskeyStats,
  renamePasskey,
  updatePasskeyCounter,
} from '@queries/passkey.queries'
import { createRefreshToken } from '@queries/refreshToken.queries'
import { findUserByIdComplete } from '@queries/user.queries'
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { ApiError } from '@utils/ApiError'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'
import { signTokens } from '@utils/jwt'
import {
  base64urlToBuffer,
  bufferToBase64url,
  generatePasskeyAuthenticationOptions,
  generatePasskeyRegistrationOptions,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from '@utils/webauthn'

/**
 * Interface for storing challenges temporarily
 * In production, use Redis or similar for distributed systems
 */
const challenges = new Map<string, StoredChallenge>()

// Clean up expired challenges every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    const FIVE_MINUTES = 5 * 60 * 1000
    for (const [key, value] of challenges.entries()) {
      if (now - value.timestamp > FIVE_MINUTES) {
        challenges.delete(key)
      }
    }
  },
  5 * 60 * 1000
)

/**
 * Generate registration options for creating a new passkey
 * POST /api/auth/passkey/register/options
 */
export const generateRegistrationOptions: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get user details
    const userDetails = await User.findByEmail(user.email)

    if (!userDetails) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Get existing passkeys for this user
    const existingPasskeys = await findPasskeysByUserId(user.id)

    // Generate registration options
    const options = await generatePasskeyRegistrationOptions(
      user.id,
      user.email,
      user.name,
      existingPasskeys
        .filter((p) => p.transports !== null && p.transports !== undefined)
        .map((p) => ({
          credentialId: p.credentialId,
          transports: p.transports as AuthenticatorTransportFuture[],
        }))
    )

    // Store challenge temporarily
    challenges.set(`reg-${user.id}`, {
      challenge: options.challenge,
      timestamp: Date.now(),
    })

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        SUCCESS_MESSAGES.PASSKEY_REGISTRATION_OPTIONS_GENERATED,
        {
          options,
        }
      )
    )
  }
)

/**
 * Verify and register a new passkey
 * POST /api/auth/passkey/register/verify
 */
export const verifyRegistration: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser
    const { name, credential } = req.body as {
      name: string
      credential: RegistrationResponseJSON
    }

    // Get stored challenge
    const storedChallenge = challenges.get(`reg-${user.id}`)

    if (!storedChallenge) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PASSKEY_CHALLENGE_EXPIRED
      )
    }

    // Verify registration
    const verification = await verifyPasskeyRegistration(
      credential,
      storedChallenge.challenge
    )

    if (!verification.verified || !verification.registrationInfo) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PASSKEY_REGISTRATION_FAILED
      )
    }

    const { registrationInfo } = verification

    // Extract credential data
    const credentialId = registrationInfo.credential.id
    const publicKey = bufferToBase64url(registrationInfo.credential.publicKey)

    // Determine credential type
    const credentialType: PasskeyCredentialType =
      registrationInfo.credentialDeviceType === 'singleDevice'
        ? 'platform'
        : 'roaming'

    // Create passkey record
    const createData: CreatePasskeyData = {
      userId: user.id,
      credentialId,
      publicKey,
      counter: registrationInfo.credential.counter,
      credentialType,
      name,
      backupEligible: registrationInfo.credentialBackedUp ?? false,
      backupState: registrationInfo.credentialBackedUp ?? false,
    }

    // Add optional properties only if they have values
    if (credential.response.transports) {
      createData.transports = credential.response.transports
    }
    if (registrationInfo.aaguid) {
      createData.aaguid = bufferToBase64url(
        Buffer.from(registrationInfo.aaguid, 'hex')
      )
    }
    if (req.headers['user-agent']) {
      createData.userAgent = req.headers['user-agent']
    }
    if (req.ip) {
      createData.ipAddress = req.ip
    }

    const passkey = await createPasskey(createData)

    // Clean up challenge
    challenges.delete(`reg-${user.id}`)

    // Transform response (exclude internal fields)
    const passkeyData = {
      id: passkey.id,
      name: passkey.name,
      credentialType: passkey.credentialType,
      createdAt: passkey.createdAt,
    }

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        SUCCESS_MESSAGES.PASSKEY_REGISTERED,
        {
          passkey: passkeyData,
        }
      )
    )
  }
)

/**
 * Generate authentication options for logging in with a passkey
 * POST /api/auth/passkey/authenticate/options
 */
export const generateAuthenticationOptions: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string }

    let allowedCredentials: Array<{
      credentialId: string
      transports?: AuthenticatorTransportFuture[]
    }> = []

    // If email provided, get user's passkeys
    if (email) {
      const user = await User.findByEmail(email)
      if (user) {
        const passkeys = await findPasskeysByUserId(user.id)
        allowedCredentials = passkeys
          .filter((p) => p.transports !== null && p.transports !== undefined)
          .map((p) => ({
            credentialId: p.credentialId,
            transports: p.transports as AuthenticatorTransportFuture[],
          }))
      }
    }

    // Generate authentication options
    const options =
      await generatePasskeyAuthenticationOptions(allowedCredentials)

    // Store challenge temporarily
    const challengeKey = email ? `auth-${email}` : `auth-${options.challenge}`
    challenges.set(challengeKey, {
      challenge: options.challenge,
      timestamp: Date.now(),
    })

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        SUCCESS_MESSAGES.PASSKEY_AUTHENTICATION_OPTIONS_GENERATED,
        {
          options,
        }
      )
    )
  }
)

/**
 * Verify passkey authentication and complete login
 * POST /api/auth/passkey/authenticate/verify
 */
export const verifyAuthentication: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { credential } = req.body as {
      credential: AuthenticationResponseJSON
    }

    // Find passkey by credential ID
    const passkey = await findPasskeyByCredentialId(credential.id)

    if (!passkey) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.PASSKEY_INVALID_CREDENTIAL
      )
    }

    // Get stored challenge
    // Try both email-based and challenge-based keys
    const user = await User.query().findById(passkey.userId)
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Decode clientDataJSON to extract the challenge
    const clientData = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, 'base64url').toString(
        'utf-8'
      )
    )
    const receivedChallenge = clientData.challenge

    const storedChallenge =
      challenges.get(`auth-${user.email}`) ??
      challenges.get(`auth-${receivedChallenge}`)

    if (!storedChallenge) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.PASSKEY_CHALLENGE_EXPIRED
      )
    }

    // Prepare authenticator credential object
    const publicKeyBuffer = base64urlToBuffer(passkey.publicKey)
    const authenticatorCredential = {
      id: passkey.credentialId, // Base64URLString
      publicKey: new Uint8Array(publicKeyBuffer),
      counter: passkey.counter,
    } as const

    // Conditionally add transports if available
    const finalAuthenticatorCredential = passkey.transports
      ? {
          ...authenticatorCredential,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        }
      : authenticatorCredential

    // Verify authentication
    const verification = await verifyPasskeyAuthentication(
      credential,
      storedChallenge.challenge,
      finalAuthenticatorCredential
    )

    if (!verification.verified || !verification.authenticationInfo) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.PASSKEY_AUTHENTICATION_FAILED
      )
    }

    // Update counter
    await updatePasskeyCounter(
      passkey.id,
      verification.authenticationInfo.newCounter
    )

    // Clean up challenge
    challenges.delete(`auth-${user.email}`)

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.ACCOUNT_DEACTIVATED
      )
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

    // Set tokens in HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    }

    // Prepare login response data
    const responseData: LoginResponseData = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleData,
        permissions: permissionsData,
        tenants: tenantsData,
        selectedTenantId: primaryTenant.id,
      },
    }

    res
      .cookie('refreshToken', refreshToken, cookieOptions)
      .cookie('accessToken', accessToken, cookieOptions)
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.PASSKEY_AUTHENTICATED,
          responseData
        )
      )
  }
)

/**
 * List all passkeys for the authenticated user
 * GET /api/auth/passkey
 */
export const listPasskeys: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    const passkeys = await findPasskeysByUserId(user.id)

    // Transform response (exclude sensitive fields)
    const passkeysData = passkeys.map((p) => ({
      id: p.id,
      name: p.name,
      credentialType: p.credentialType,
      transports: p.transports ?? null,
      isActive: p.isActive,
      lastUsedAt: p.lastUsedAt,
      backupEligible: p.backupEligible,
      backupState: p.backupState,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSKEYS_RETRIEVED, {
        passkeys: passkeysData,
        total: passkeysData.length,
      })
    )
  }
)

/**
 * Get a single passkey by ID
 * GET /api/auth/passkey/:id
 */
export const getPasskey: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser
    const { id } = req.params

    if (!id) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.VALIDATION_FAILED
      )
    }

    const passkey = await findPasskeyById(id)

    if (!passkey) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.PASSKEY_NOT_FOUND
      )
    }

    // Verify ownership
    if (passkey.userId !== user.id) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
    }

    // Transform response (exclude sensitive fields)
    const passkeyData = {
      id: passkey.id,
      name: passkey.name,
      credentialType: passkey.credentialType,
      transports: passkey.transports ?? null,
      isActive: passkey.isActive,
      lastUsedAt: passkey.lastUsedAt,
      backupEligible: passkey.backupEligible,
      backupState: passkey.backupState,
      createdAt: passkey.createdAt,
      updatedAt: passkey.updatedAt,
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSKEY_RETRIEVED, {
        passkey: passkeyData,
      })
    )
  }
)

/**
 * Rename a passkey
 * PATCH /api/auth/passkey/:id/rename
 */
export const updatePasskeyName: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser
    const { id } = req.params
    const { name } = req.body

    if (!id) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.VALIDATION_FAILED
      )
    }

    const updatedPasskey = await renamePasskey(id, user.id, name)

    // Transform response
    const passkeyData = {
      id: updatedPasskey.id,
      name: updatedPasskey.name,
      updatedAt: updatedPasskey.updatedAt,
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSKEY_RENAMED, {
        passkey: passkeyData,
      })
    )
  }
)

/**
 * Delete a passkey
 * DELETE /api/auth/passkey/:id
 */
export const removePasskey: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser
    const { id } = req.params

    if (!id) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.VALIDATION_FAILED
      )
    }

    await deletePasskey(id, user.id)

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSKEY_DELETED, {})
      )
  }
)

/**
 * Enable a passkey
 * PATCH /api/auth/passkey/:id/enable
 */
export const enablePasskey: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser
    const { id } = req.params

    if (!id) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.VALIDATION_FAILED
      )
    }

    const updatedPasskey = await activatePasskey(id, user.id)

    const passkeyData = {
      id: updatedPasskey.id,
      isActive: updatedPasskey.isActive,
      updatedAt: updatedPasskey.updatedAt,
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSKEY_ACTIVATED, {
        passkey: passkeyData,
      })
    )
  }
)

/**
 * Disable a passkey
 * PATCH /api/auth/passkey/:id/disable
 */
export const disablePasskey: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser
    const { id } = req.params

    if (!id) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.VALIDATION_FAILED
      )
    }

    const updatedPasskey = await deactivatePasskey(id, user.id)

    const passkeyData = {
      id: updatedPasskey.id,
      isActive: updatedPasskey.isActive,
      updatedAt: updatedPasskey.updatedAt,
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSKEY_DEACTIVATED, {
        passkey: passkeyData,
      })
    )
  }
)

/**
 * Get passkey statistics for the authenticated user
 * GET /api/auth/passkey/stats
 */
export const getPasskeysStats: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    const stats = await getPasskeyStats(user.id)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        SUCCESS_MESSAGES.PASSKEY_STATS_RETRIEVED,
        {
          stats,
        }
      )
    )
  }
)
