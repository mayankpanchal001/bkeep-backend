"use strict";
/**
 * Login Schema
 * Zod validation schema for user login requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.totpLoginSchema = exports.totpVerifySchema = exports.mfaVerifySchema = exports.updateProfileSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const validation_1 = require("../constants/validation");
/**
 * Login request body schema
 * Validates email and password for authentication
 */
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email({ message: "Invalid email format" })
        .max(validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH, {
        message: `Email must not exceed ${validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
    password: zod_1.z
        .string()
        .min(validation_1.VALIDATION_RULES.PASSWORD_MIN_LENGTH)
        .max(validation_1.VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
        message: `Password must not exceed ${validation_1.VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
    }),
});
/**
 * Refresh token request body schema
 * Validates refresh token (optional since it can come from cookie)
 */
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z
        .string({ message: "Refresh token must be a string" })
        .min(1, { message: "Refresh token cannot be empty" })
        .optional(),
});
/**
 * Forgot password schema
 * Validates email for password reset request
 */
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email({ message: "Invalid email format" })
        .max(validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH, {
        message: `Email must not exceed ${validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
});
/**
 * Reset password schema
 * Validates token, email, and new password
 */
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email({ message: "Invalid email format" })
        .max(validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH, {
        message: `Email must not exceed ${validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
    token: zod_1.z.string().min(1, { message: "Reset token is required" }),
    password: zod_1.z
        .string()
        .min(validation_1.VALIDATION_RULES.PASSWORD_MIN_LENGTH, {
        message: `Password must be at least ${validation_1.VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`,
    })
        .max(validation_1.VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
        message: `Password must not exceed ${validation_1.VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
    }),
});
/**
 * Update profile schema
 * Validates name for profile update
 */
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, { message: "Name is required" })
        .max(validation_1.VALIDATION_RULES.NAME_MAX_LENGTH, {
        message: `Name must not exceed ${validation_1.VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
    }),
});
/**
 * MFA verify schema
 * Validates OTP code for MFA verification
 */
exports.mfaVerifySchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .email({ message: "Invalid email format" })
        .max(validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH, {
        message: `Email must not exceed ${validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
    code: zod_1.z
        .string()
        .length(6, { message: "Verification code must be 6 digits" })
        .regex(/^\d+$/, { message: "Verification code must contain only digits" }),
});
/**
 * TOTP setup verification schema
 * Validates TOTP code for enabling authenticator
 */
exports.totpVerifySchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .length(6, { message: "TOTP code must be 6 digits" })
        .regex(/^\d+$/, { message: "TOTP code must contain only digits" }),
});
/**
 * TOTP or backup code verification schema (for login)
 * Validates either TOTP code or backup code
 */
exports.totpLoginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .email({ message: "Invalid email format" })
        .max(validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH, {
        message: `Email must not exceed ${validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
    }),
    code: zod_1.z
        .string()
        .min(6, { message: "Code must be at least 6 characters" })
        .max(10, { message: "Code must not exceed 10 characters" })
        .regex(/^[\da-z]+$/i, {
        message: "Code must contain only letters and numbers",
    }),
    isBackupCode: zod_1.z.boolean().optional().default(false),
});
/**
 * Change password schema
 * Validates current password and new password
 */
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z
        .string()
        .min(1, { message: "Current password is required" }),
    newPassword: zod_1.z
        .string()
        .min(validation_1.VALIDATION_RULES.PASSWORD_MIN_LENGTH, {
        message: `Password must be at least ${validation_1.VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`,
    })
        .max(validation_1.VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
        message: `Password must not exceed ${validation_1.VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
    }),
});
