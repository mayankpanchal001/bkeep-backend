import { PasswordReset } from '@models/PasswordReset'
import { getCurrentISOString, getCurrentMoment } from '@utils/date'

/**
 * Interface for creating a password reset token
 */
export interface CreatePasswordResetTokenData {
  email: string
  token: string
  expiresInMinutes?: number
}

/**
 * Create and store a password reset token in the database
 * @param data - Password reset token data
 * @returns Created PasswordReset instance
 */
export const createPasswordResetToken = async (
  data: CreatePasswordResetTokenData
): Promise<PasswordReset> => {
  const { email, token, expiresInMinutes = 60 } = data

  // Calculate expiry time (default: 60 minutes from now)
  const expiresAt = getCurrentMoment().add(expiresInMinutes, 'minutes').toDate()

  // Revoke any existing password reset tokens for this email
  await revokePasswordResetTokensByEmail(email)

  // Create password reset token record
  const passwordReset = await PasswordReset.query().insert({
    email,
    token,
    expiresAt: expiresAt.toISOString() as unknown as Date,
  })

  return passwordReset
}

/**
 * Find password reset token by email and token
 * @param email - User email
 * @param token - Reset token
 * @returns PasswordReset if found and valid, undefined otherwise
 */
export const findPasswordResetToken = async (
  email: string,
  token: string
): Promise<PasswordReset | undefined> => {
  return PasswordReset.findByEmailAndToken(email, token)
}

/**
 * Find password reset token by token only
 * @param token - Reset token
 * @returns PasswordReset if found and valid, undefined otherwise
 */
export const findPasswordResetTokenByToken = async (
  token: string
): Promise<PasswordReset | undefined> => {
  return PasswordReset.findByToken(token)
}

/**
 * Revoke a password reset token (soft delete)
 * @param token - Password reset token string
 * @returns Number of tokens revoked
 */
export const revokePasswordResetToken = async (
  token: string
): Promise<number> => {
  const revoked = await PasswordReset.query()
    .modify('notDeleted')
    .where({ token })
    .patch({ deletedAt: getCurrentISOString() as unknown as Date })

  return revoked
}

/**
 * Revoke all password reset tokens for an email
 * @param email - User email
 * @returns Number of tokens revoked
 */
export const revokePasswordResetTokensByEmail = async (
  email: string
): Promise<number> => {
  const revoked = await PasswordReset.query()
    .modify('notDeleted')
    .where({ email })
    .patch({ deletedAt: getCurrentISOString() as unknown as Date })

  return revoked
}

/**
 * Delete expired password reset tokens (hard delete for cleanup)
 * @returns Number of tokens deleted
 */
export const deleteExpiredPasswordResetTokens = async (): Promise<number> => {
  return PasswordReset.deleteExpired()
}
