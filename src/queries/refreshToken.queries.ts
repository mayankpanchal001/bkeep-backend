import { RefreshToken, getTokenExpiry } from '@models/RefreshToken'
import { getCurrentISOString } from '@utils/date'

/**
 * Interface for creating a refresh token
 */
export interface CreateRefreshTokenData {
  userId: string
  token: string
  userAgent?: string | null
  ipAddress?: string | null
}

/**
 * Create and store a refresh token in the database
 * @param data - Refresh token data
 * @returns Created RefreshToken instance
 */
export const createRefreshToken = async (
  data: CreateRefreshTokenData
): Promise<RefreshToken> => {
  const { userId, token, userAgent, ipAddress } = data

  // Calculate token expiry from JWT
  const expiresAtDate = getTokenExpiry(token)

  // Create refresh token record
  // Convert Date to ISO string for JSON schema validation
  // Objection.js will convert the ISO string to Date for the database
  const refreshToken = await RefreshToken.query().insert({
    userId,
    token,
    expiresAt: expiresAtDate.toISOString() as unknown as Date,
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
  })

  return refreshToken
}

/**
 * Find refresh token by token string
 * @param token - Refresh token string
 * @returns RefreshToken if found and valid, undefined otherwise
 */
export const findRefreshTokenByToken = async (
  token: string
): Promise<RefreshToken | undefined> => {
  return RefreshToken.findByToken(token)
}

/**
 * Find all valid refresh tokens for a user
 * @param userId - User ID
 * @returns Array of valid RefreshToken instances
 */
export const findRefreshTokensByUserId = async (
  userId: string
): Promise<RefreshToken[]> => {
  return RefreshToken.findByUserId(userId)
}

/**
 * Revoke a refresh token (soft delete)
 * @param token - Refresh token string
 * @returns Number of tokens revoked
 */
export const revokeRefreshToken = async (token: string): Promise<number> => {
  const revoked = await RefreshToken.query()
    .modify('notDeleted')
    .where({ token })
    .patch({ deletedAt: getCurrentISOString() as unknown as Date })

  return revoked
}

/**
 * Revoke all refresh tokens for a user
 * @param userId - User ID
 * @returns Number of tokens revoked
 */
export const revokeAllRefreshTokensForUser = async (
  userId: string
): Promise<number> => {
  return RefreshToken.revokeAllForUser(userId)
}

/**
 * Delete expired refresh tokens (hard delete for cleanup)
 * @returns Number of tokens deleted
 */
export const deleteExpiredRefreshTokens = async (): Promise<number> => {
  return RefreshToken.deleteExpired()
}
