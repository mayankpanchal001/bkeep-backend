import type { RequestHandler, Response } from 'express'

import type { JwtUser } from '@/types/jwt.type'
import { env } from '@config/env'
import logger from '@config/logger'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { MFA_TYPE } from '@constants/security'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import { User } from '@models/User'
import {
  disableUserTotp,
  getUnverifiedTotpAuthenticator,
  getUserTotpAuthenticator,
  regenerateUserBackupCodes,
  setupUserTotp,
  verifyAndEnableUserTotp,
} from '@queries/authenticator.queries'
import { queueTotpSetupEmail } from '@services/mailQueue.service'
import { ApiError } from '@utils/ApiError'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'
import {
  decodeBackupCodes,
  encodeBackupCodes,
  generateBackupCodes,
  generateTotpQrCode,
  generateTotpSecret,
  verifyTotpToken,
} from '@utils/totp'

/**
 * Setup TOTP authenticator controller
 * Generates TOTP secret and QR code for user to scan with authenticator app
 */
export const setupTotp: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get user details
    const userDetails = await User.findByEmail(user.email)

    if (!userDetails) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Check if TOTP is already enabled
    const existingAuthenticator = await getUserTotpAuthenticator(user.id)
    if (existingAuthenticator?.isActiveAndVerified()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_TOTP_ALREADY_ENABLED
      )
    }

    // Generate TOTP secret
    const secret = generateTotpSecret()

    // Generate QR code
    const qrCode = await generateTotpQrCode(user.email, secret)

    // Generate backup codes
    const backupCodes = generateBackupCodes()
    const encodedBackupCodes = encodeBackupCodes(backupCodes)

    // Store secret and backup codes (but don't enable TOTP yet)
    await setupUserTotp(
      user.id,
      secret,
      encodedBackupCodes,
      req.headers['user-agent'] ?? null,
      req.ip ?? null
    )

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        SUCCESS_MESSAGES.MFA_TOTP_SETUP_INITIATED,
        {
          secret,
          qrCode,
          backupCodes,
        }
      )
    )
  }
)

/**
 * Verify and enable TOTP authenticator controller
 * Verifies TOTP code and enables TOTP for the user
 */
export const verifyAndEnableTotp: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    const { code } = req.body

    // Get user details
    const userDetails = await User.findByEmail(user.email)

    if (!userDetails) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Find the unverified authenticator
    const authenticator = await getUnverifiedTotpAuthenticator(user.id)

    if (!authenticator) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_TOTP_SETUP_REQUIRED
      )
    }

    // Verify TOTP code
    const isValid = verifyTotpToken(code, authenticator.secret)

    if (!isValid) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.MFA_TOTP_INVALID
      )
    }

    // Enable TOTP
    await verifyAndEnableUserTotp(user.id)

    // Send email notification about TOTP setup
    try {
      const recoveryCodesUrl = `${env.FRONTEND_URL}/auth/recovery-codes`
      const disableTotpUrl = `${env.FRONTEND_URL}/settings/security`
      await queueTotpSetupEmail({
        to: user.email,
        userName: userDetails.name,
        recoveryCodesUrl,
        disableTotpUrl,
      })
      logger.info('TOTP setup notification email queued', {
        userId: user.id,
        email: user.email,
      })
    } catch (error) {
      logger.error('Failed to queue TOTP setup notification email', {
        error,
        userId: user.id,
      })
      // Don't fail the request if email fails
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.MFA_TOTP_ENABLED, {
        mfaEnabled: true,
        mfaType: MFA_TYPE.TOTP,
      })
    )
  }
)

/**
 * Disable TOTP authenticator controller
 * Disables TOTP and removes secret and backup codes
 */
export const disableTotp: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get user details
    const userDetails = await User.findByEmail(user.email)

    if (!userDetails) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    // Check if TOTP authenticator exists
    const authenticator = await getUserTotpAuthenticator(user.id)
    if (!authenticator?.isActiveAndVerified()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED
      )
    }

    // Disable TOTP
    await disableUserTotp(user.id)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.MFA_TOTP_DISABLED, {
        mfaEnabled: false,
      })
    )
  }
)

/**
 * Get TOTP status controller
 * Retrieves the current TOTP status for the authenticated user
 */
export const getTotpStatus: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    const authenticator = await getUserTotpAuthenticator(user.id)
    const totpEnabled = authenticator?.isActiveAndVerified() ?? false

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.TOTP_STATUS_RETRIEVED, {
        totpEnabled,
        mfaEnabled: totpEnabled,
        mfaType: totpEnabled ? MFA_TYPE.TOTP : MFA_TYPE.EMAIL,
      })
    )
  }
)

/**
 * Regenerate backup codes controller
 * Generates new backup codes for the authenticated user
 */
export const regenerateBackupCodes: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Check if TOTP is enabled
    const authenticator = await getUserTotpAuthenticator(user.id)
    if (!authenticator?.isActiveAndVerified()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED
      )
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes()
    const encodedBackupCodes = encodeBackupCodes(backupCodes)

    // Update backup codes
    await regenerateUserBackupCodes(user.id, encodedBackupCodes)

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        SUCCESS_MESSAGES.MFA_BACKUP_CODES_GENERATED,
        {
          backupCodes,
        }
      )
    )
  }
)

/**
 * Download backup codes controller
 * Downloads remaining backup codes as a text file
 */
export const downloadBackupCodes: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Check if TOTP is enabled
    const authenticator = await getUserTotpAuthenticator(user.id)
    if (!authenticator?.isActiveAndVerified()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED
      )
    }

    // Check if backup codes exist
    if (!authenticator.backupCodes) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID
      )
    }

    // Decode backup codes
    const backupCodes = decodeBackupCodes(authenticator.backupCodes)

    if (backupCodes.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID
      )
    }

    // Format backup codes as text file
    const content = [
      'BKeep - Backup Codes',
      '',
      'These are your backup codes for two-factor authentication.',
      'Each code can only be used once.',
      '',
      'IMPORTANT: Store these codes in a safe place. If you lose access to your authenticator app, you can use these codes to sign in.',
      '',
      'Backup Codes:',
      ...backupCodes.map((code, index) => `${index + 1}. ${code}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n')

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="bkeep-backup-codes.txt"'
    )

    res.send(content)
  }
)
