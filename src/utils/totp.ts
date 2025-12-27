/**
 * TOTP (Time-Based One-Time Password) Utility Functions
 * Used for Google Authenticator, Microsoft Authenticator, etc.
 */

import { randomBytes } from 'node:crypto'

import { authenticator } from 'otplib'
import QRCode from 'qrcode'

import { SECURITY_RULES } from '@constants/security'

/**
 * Configure TOTP options
 */
authenticator.options = {
  step: SECURITY_RULES.TOTP_STEP,
  window: SECURITY_RULES.TOTP_WINDOW,
  digits: SECURITY_RULES.TOTP_DIGITS,
  // @ts-expect-error - otplib types are inconsistent with runtime values
  algorithm: 'sha1',
}

/**
 * Generate a new TOTP secret
 * @returns Base32 encoded secret string
 */
export const generateTotpSecret = (): string => {
  return authenticator.generateSecret()
}

/**
 * Generate TOTP token for testing (should only be used in development)
 * @param secret - TOTP secret
 * @returns 6-digit TOTP code
 */
export const generateTotpToken = (secret: string): string => {
  return authenticator.generate(secret)
}

/**
 * Verify TOTP token
 * @param token - 6-digit TOTP code provided by user
 * @param secret - User's TOTP secret
 * @returns True if token is valid, false otherwise
 */
export const verifyTotpToken = (token: string, secret: string): boolean => {
  try {
    return authenticator.verify({ token, secret })
  } catch {
    return false
  }
}

/**
 * Generate OTPAuth URL for QR code
 * @param email - User's email
 * @param secret - TOTP secret
 * @param issuer - Issuer name (default: BKeep)
 * @returns OTPAuth URL string
 */
export const generateTotpUrl = (
  email: string,
  secret: string,
  issuer: string = SECURITY_RULES.TOTP_ISSUER
): string => {
  return authenticator.keyuri(email, issuer, secret)
}

/**
 * Generate QR code data URL for TOTP setup
 * @param email - User's email
 * @param secret - TOTP secret
 * @param issuer - Issuer name (default: BKeep)
 * @returns QR code as data URL (base64 encoded PNG)
 */
export const generateTotpQrCode = async (
  email: string,
  secret: string,
  issuer: string = SECURITY_RULES.TOTP_ISSUER
): Promise<string> => {
  const otpauthUrl = generateTotpUrl(email, secret, issuer)
  // Generate QR code as data URL (base64 encoded PNG)
  return QRCode.toDataURL(otpauthUrl)
}

/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate (default: 10)
 * @param length - Length of each backup code (default: 8)
 * @returns Array of backup codes
 */
export const generateBackupCodes = (
  count: number = SECURITY_RULES.BACKUP_CODES_COUNT,
  length: number = SECURITY_RULES.BACKUP_CODE_LENGTH
): string[] => {
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    // Generate random bytes and convert to alphanumeric string
    const code = randomBytes(length)
      .toString('hex')
      .slice(0, length)
      .toUpperCase()
    codes.push(code)
  }

  return codes
}

/**
 * Hash backup code for storage
 * Uses simple format: code1,code2,code3
 * In production, you might want to hash these individually
 * @param codes - Array of backup codes
 * @returns JSON string of codes
 */
export const encodeBackupCodes = (codes: string[]): string => {
  return JSON.stringify(codes)
}

/**
 * Decode stored backup codes
 * @param encodedCodes - JSON string of backup codes
 * @returns Array of backup codes
 */
export const decodeBackupCodes = (encodedCodes: string): string[] => {
  try {
    return JSON.parse(encodedCodes)
  } catch {
    return []
  }
}

/**
 * Verify backup code and remove it from the list
 * @param code - Backup code provided by user
 * @param encodedCodes - JSON string of stored backup codes
 * @returns Object with verification result and updated codes
 */
export const verifyBackupCode = (
  code: string,
  encodedCodes: string
): { isValid: boolean; updatedCodes: string } => {
  const codes = decodeBackupCodes(encodedCodes)
  const normalizedCode = code.toUpperCase().replaceAll(/\s/g, '')

  const codeIndex = codes.findIndex((c) => c === normalizedCode)

  if (codeIndex === -1) {
    return { isValid: false, updatedCodes: encodedCodes }
  }

  // Remove the used backup code
  codes.splice(codeIndex, 1)
  const updatedCodes = encodeBackupCodes(codes)

  return { isValid: true, updatedCodes }
}

/**
 * Check if user has remaining backup codes
 * @param encodedCodes - JSON string of stored backup codes
 * @returns Number of remaining backup codes
 */
export const getRemainingBackupCodesCount = (encodedCodes: string): number => {
  const codes = decodeBackupCodes(encodedCodes)
  return codes.length
}
