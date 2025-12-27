/**
 * Login Schema
 * Zod validation schema for user login requests
 */

import { z } from 'zod'

import { VALIDATION_RULES } from '@constants/validation'

/**
 * Login request body schema
 * Validates email and password for authentication
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, {
      message: `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
  password: z
    .string()
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH)
    .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
      message: `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
    }),
})

/**
 * Refresh token request body schema
 * Validates refresh token (optional since it can come from cookie)
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ message: 'Refresh token must be a string' })
    .min(1, { message: 'Refresh token cannot be empty' })
    .optional(),
})

/**
 * Type inference for login schema
 */
export type AuthInput = z.infer<typeof loginSchema>

/**
 * Forgot password schema
 * Validates email for password reset request
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, {
      message: `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
})

/**
 * Reset password schema
 * Validates token, email, and new password
 */
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, {
      message: `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
  token: z.string().min(1, { message: 'Reset token is required' }),
  password: z
    .string()
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, {
      message: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`,
    })
    .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
      message: `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
    }),
})

/**
 * Type inference for refresh token schema
 */
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>

/**
 * Type inference for forgot password schema
 */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

/**
 * Type inference for reset password schema
 */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * Update profile schema
 * Validates name for profile update
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Name is required' })
    .max(VALIDATION_RULES.NAME_MAX_LENGTH, {
      message: `Name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
    }),
})

/**
 * Type inference for update profile schema
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * MFA verify schema
 * Validates OTP code for MFA verification
 */
export const mfaVerifySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email format' })
    .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, {
      message: `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
  code: z
    .string()
    .length(6, { message: 'Verification code must be 6 digits' })
    .regex(/^\d+$/, { message: 'Verification code must contain only digits' }),
})

/**
 * Type inference for MFA verify schema
 */
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>

/**
 * TOTP setup verification schema
 * Validates TOTP code for enabling authenticator
 */
export const totpVerifySchema = z.object({
  code: z
    .string()
    .length(6, { message: 'TOTP code must be 6 digits' })
    .regex(/^\d+$/, { message: 'TOTP code must contain only digits' }),
})

/**
 * Type inference for TOTP verify schema
 */
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>

/**
 * TOTP or backup code verification schema (for login)
 * Validates either TOTP code or backup code
 */
export const totpLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email format' })
    .max(VALIDATION_RULES.EMAIL_MAX_LENGTH, {
      message: `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
  code: z
    .string()
    .min(6, { message: 'Code must be at least 6 characters' })
    .max(10, { message: 'Code must not exceed 10 characters' })
    .regex(/^[\da-z]+$/i, {
      message: 'Code must contain only letters and numbers',
    }),
  isBackupCode: z.boolean().optional().default(false),
})

/**
 * Type inference for TOTP login schema
 */
export type TotpLoginInput = z.infer<typeof totpLoginSchema>

/**
 * Change password schema
 * Validates current password and new password
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: 'Current password is required' }),
  newPassword: z
    .string()
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, {
      message: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`,
    })
    .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
      message: `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
    }),
})

/**
 * Type inference for change password schema
 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
