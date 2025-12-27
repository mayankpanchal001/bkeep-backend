import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { User } from '@models/User'
import { UserAuthenticator } from '@models/UserAuthenticator'
import { ApiError } from '@utils/ApiError'
import { getCurrentISOString } from '@utils/date'

/**
 * Setup TOTP for user (create authenticator)
 * @param userId - User ID
 * @param secret - TOTP secret
 * @param backupCodes - JSON encoded backup codes
 * @param userAgent - User agent string
 * @param ipAddress - IP address
 * @returns Created UserAuthenticator object
 * @throws ApiError if user not found
 */
export const setupUserTotp = async (
  userId: string,
  secret: string,
  backupCodes: string,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<UserAuthenticator> => {
  // Verify user exists
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Deactivate any existing authenticators for this user
  await UserAuthenticator.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .patch({
      isActive: false,
    })

  // Create new authenticator (unverified)
  const authenticator = await UserAuthenticator.query().insert({
    userId,
    type: 'totp',
    secret,
    backupCodes,
    isActive: false, // Not active until verified
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
  })

  return authenticator
}

/**
 * Verify and enable TOTP for user
 * @param userId - User ID
 * @param authenticatorId - Optional authenticator ID (if not provided, uses the latest unverified one)
 * @returns Verified UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
export const verifyAndEnableUserTotp = async (
  userId: string,
  authenticatorId?: string
): Promise<UserAuthenticator> => {
  // Verify user exists
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Find the authenticator
  let authenticator: UserAuthenticator | undefined

  if (authenticatorId) {
    authenticator = await UserAuthenticator.query()
      .modify('notDeleted')
      .modify('byUser', userId)
      .findById(authenticatorId)
  } else {
    // Find the most recent unverified authenticator
    authenticator = await UserAuthenticator.query()
      .modify('notDeleted')
      .modify('byUser', userId)
      .modify('unverified')
      .orderBy('created_at', 'desc')
      .first()
  }

  if (!authenticator) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.MFA_TOTP_SETUP_REQUIRED
    )
  }

  // Activate and verify the authenticator
  await authenticator.$query().patch({
    isActive: true,
    verifiedAt: getCurrentISOString() as unknown as Date,
  })

  // Enable MFA on user account
  await user.$query().patch({
    mfaEnabled: true,
  })

  return authenticator
}

/**
 * Disable TOTP for user
 * @param userId - User ID
 * @returns Updated User object
 * @throws ApiError if user not found
 */
export const disableUserTotp = async (userId: string): Promise<User> => {
  // Verify user exists
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Soft delete all authenticators for this user
  await UserAuthenticator.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .patch({
      deletedAt: getCurrentISOString() as unknown as Date,
    })

  // Disable MFA on user account
  await user.$query().patch({
    mfaEnabled: false,
  })

  return user
}

/**
 * Update user backup codes
 * @param userId - User ID
 * @param backupCodes - JSON encoded backup codes
 * @returns Updated UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
export const updateUserBackupCodes = async (
  userId: string,
  backupCodes: string
): Promise<UserAuthenticator> => {
  // Find active TOTP authenticator
  const authenticator = await UserAuthenticator.findActiveByUserAndType(
    userId,
    'totp'
  )

  if (!authenticator) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED
    )
  }

  // Update backup codes
  await authenticator.$query().patch({
    backupCodes,
  })

  return authenticator
}

/**
 * Get active TOTP authenticator for user
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
export const getUserTotpAuthenticator = async (
  userId: string
): Promise<UserAuthenticator | undefined> => {
  return UserAuthenticator.findActiveByUserAndType(userId, 'totp')
}

/**
 * Get unverified TOTP authenticator for user
 * Used during TOTP verification process
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
export const getUnverifiedTotpAuthenticator = async (
  userId: string
): Promise<UserAuthenticator | undefined> => {
  return UserAuthenticator.query()
    .modify('notDeleted')
    .modify('byUser', userId)
    .modify('byType', 'totp')
    .modify('unverified')
    .orderBy('created_at', 'desc')
    .first()
}

/**
 * Update authenticator last used timestamp
 * @param authenticatorId - Authenticator ID
 */
export const updateAuthenticatorLastUsed = async (
  authenticatorId: string
): Promise<void> => {
  await UserAuthenticator.query()
    .findById(authenticatorId)
    .patch({
      lastUsedAt: getCurrentISOString() as unknown as Date,
    })
}

/**
 * Regenerate backup codes for user
 * @param userId - User ID
 * @param newBackupCodes - JSON encoded new backup codes
 * @returns Updated UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
export const regenerateUserBackupCodes = async (
  userId: string,
  newBackupCodes: string
): Promise<UserAuthenticator> => {
  return updateUserBackupCodes(userId, newBackupCodes)
}
