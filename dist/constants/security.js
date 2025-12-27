"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFA_TYPE = exports.BACKUP_CODES_DOWNLOAD_TEMPLATE = exports.SECURITY_RULES = void 0;
/**
 * Security Constants
 * Standardized security constants used throughout the application
 */
exports.SECURITY_RULES = {
    SESSION_NAME: "session",
    SESSION_MAX_AGE: 15 * 60 * 1000,
    PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: 60,
    MFA_OTP_EXPIRY_MINUTES: 5,
    USER_INVITATION_TOKEN_EXPIRY_MINUTES: 10080, // 7 days
    TOTP_WINDOW: 1, // Allow 1 step before/after current time (30 seconds window)
    TOTP_STEP: 30, // 30 seconds per step
    TOTP_DIGITS: 6, // 6-digit codes
    TOTP_ALGORITHM: "sha1", // Algorithm for TOTP (Google Authenticator standard)
    TOTP_ISSUER: "BKeep", // Issuer name shown in authenticator apps
    BACKUP_CODES_COUNT: 10, // Number of backup codes to generate
    BACKUP_CODE_LENGTH: 8, // Length of each backup code
    BACKUP_CODES_FILENAME_PREFIX: "bkeep-backup-codes", // Prefix for backup codes download filename
};
/**
 * Backup Codes Download Template
 * Template for generating backup codes download file content
 */
exports.BACKUP_CODES_DOWNLOAD_TEMPLATE = {
    HEADER: (issuer) => `${issuer} - Backup Codes`,
    DESCRIPTION: "These are your backup codes for two-factor authentication.",
    USAGE_NOTE: "Each code can only be used once.",
    IMPORTANT_NOTE: "IMPORTANT: Store these codes in a safe place. If you lose access to your authenticator app, you can use these codes to sign in.",
    CODES_LABEL: "Backup Codes:",
    GENERATED_LABEL: "Generated:",
    EMAIL_LABEL: "Email:",
    SECURITY_REMINDER: "Keep these codes secure and do not share them with anyone.",
};
/**
 * MFA Type Constants
 */
exports.MFA_TYPE = {
    EMAIL: "email",
    TOTP: "totp",
};
