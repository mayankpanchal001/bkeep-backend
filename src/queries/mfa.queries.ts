import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { SECURITY_RULES } from '@constants/security'
import { MfaEmailOtp } from '@models/MfaEmailOtp'
import { ApiError } from '@utils/ApiError'
import { getCurrentISOString, getCurrentMoment } from '@utils/date'

/**
 * Create email OTP for user
 * @param userId - User ID
 * @param code - 6-digit OTP code
 * @param expiresInMinutes - Expiration time in minutes (default: MFA_OTP_EXPIRY_MINUTES)
 * @param userAgent - User agent string (optional)
 * @param ipAddress - IP address (optional)
 * @returns Created MfaEmailOtp object
 */
export const createMfaOtp = async (
  userId: string,
  code: string,
  expiresInMinutes: number = SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<MfaEmailOtp> => {
  // Soft delete any existing email OTP codes for this user
  await MfaEmailOtp.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .patch({
      deletedAt: getCurrentISOString() as unknown as Date,
    })

  // Calculate expiration time (5 minutes by default)
  const expiresAt = getCurrentMoment().add(expiresInMinutes, 'minutes').toDate()

  // Create new email OTP code
  const mfaOtp = await MfaEmailOtp.query().insert({
    userId,
    code,
    expiresAt: expiresAt.toISOString() as unknown as Date,
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
  })

  return mfaOtp
}

/**
 * Verify email OTP
 * @param userId - User ID
 * @param code - 6-digit OTP code to verify
 * @returns MfaEmailOtp object if valid
 * @throws ApiError if email OTP code is invalid or expired
 */
export const verifyMfaOtp = async (
  userId: string,
  code: string
): Promise<MfaEmailOtp> => {
  // Find email OTP code by user ID and code
  const mfaOtp = await MfaEmailOtp.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .where('code', code)
    .first()

  if (!mfaOtp) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.MFA_OTP_INVALID_OR_EXPIRED
    )
  }

  // Check if email OTP code has expired
  if (mfaOtp.isExpired()) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.MFA_OTP_INVALID_OR_EXPIRED
    )
  }

  // Soft delete the email OTP code after successful verification
  await mfaOtp.softDelete()

  return mfaOtp
}

/**
 * Delete expired email OTP codes (cleanup method)
 * @returns Number of deleted email OTP codes
 */
export const deleteExpiredMfaCodes = async (): Promise<number> => {
  return MfaEmailOtp.deleteExpired()
}
