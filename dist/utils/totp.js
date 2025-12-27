"use strict";
/**
 * TOTP (Time-Based One-Time Password) Utility Functions
 * Used for Google Authenticator, Microsoft Authenticator, etc.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemainingBackupCodesCount = exports.verifyBackupCode = exports.decodeBackupCodes = exports.encodeBackupCodes = exports.generateBackupCodes = exports.generateTotpQrCode = exports.generateTotpUrl = exports.verifyTotpToken = exports.generateTotpToken = exports.generateTotpSecret = void 0;
const node_crypto_1 = require("node:crypto");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const security_1 = require("../constants/security");
/**
 * Configure TOTP options
 */
otplib_1.authenticator.options = {
    step: security_1.SECURITY_RULES.TOTP_STEP,
    window: security_1.SECURITY_RULES.TOTP_WINDOW,
    digits: security_1.SECURITY_RULES.TOTP_DIGITS,
    // @ts-expect-error - otplib types are inconsistent with runtime values
    algorithm: "sha1",
};
/**
 * Generate a new TOTP secret
 * @returns Base32 encoded secret string
 */
const generateTotpSecret = () => {
    return otplib_1.authenticator.generateSecret();
};
exports.generateTotpSecret = generateTotpSecret;
/**
 * Generate TOTP token for testing (should only be used in development)
 * @param secret - TOTP secret
 * @returns 6-digit TOTP code
 */
const generateTotpToken = (secret) => {
    return otplib_1.authenticator.generate(secret);
};
exports.generateTotpToken = generateTotpToken;
/**
 * Verify TOTP token
 * @param token - 6-digit TOTP code provided by user
 * @param secret - User's TOTP secret
 * @returns True if token is valid, false otherwise
 */
const verifyTotpToken = (token, secret) => {
    try {
        return otplib_1.authenticator.verify({ token, secret });
    }
    catch {
        return false;
    }
};
exports.verifyTotpToken = verifyTotpToken;
/**
 * Generate OTPAuth URL for QR code
 * @param email - User's email
 * @param secret - TOTP secret
 * @param issuer - Issuer name (default: BKeep)
 * @returns OTPAuth URL string
 */
const generateTotpUrl = (email, secret, issuer = security_1.SECURITY_RULES.TOTP_ISSUER) => {
    return otplib_1.authenticator.keyuri(email, issuer, secret);
};
exports.generateTotpUrl = generateTotpUrl;
/**
 * Generate QR code data URL for TOTP setup
 * @param email - User's email
 * @param secret - TOTP secret
 * @param issuer - Issuer name (default: BKeep)
 * @returns QR code as data URL (base64 encoded PNG)
 */
const generateTotpQrCode = async (email, secret, issuer = security_1.SECURITY_RULES.TOTP_ISSUER) => {
    const otpauthUrl = (0, exports.generateTotpUrl)(email, secret, issuer);
    // Generate QR code as data URL (base64 encoded PNG)
    return qrcode_1.default.toDataURL(otpauthUrl);
};
exports.generateTotpQrCode = generateTotpQrCode;
/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate (default: 10)
 * @param length - Length of each backup code (default: 8)
 * @returns Array of backup codes
 */
const generateBackupCodes = (count = security_1.SECURITY_RULES.BACKUP_CODES_COUNT, length = security_1.SECURITY_RULES.BACKUP_CODE_LENGTH) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // Generate random bytes and convert to alphanumeric string
        const code = (0, node_crypto_1.randomBytes)(length)
            .toString("hex")
            .slice(0, length)
            .toUpperCase();
        codes.push(code);
    }
    return codes;
};
exports.generateBackupCodes = generateBackupCodes;
/**
 * Hash backup code for storage
 * Uses simple format: code1,code2,code3
 * In production, you might want to hash these individually
 * @param codes - Array of backup codes
 * @returns JSON string of codes
 */
const encodeBackupCodes = (codes) => {
    return JSON.stringify(codes);
};
exports.encodeBackupCodes = encodeBackupCodes;
/**
 * Decode stored backup codes
 * @param encodedCodes - JSON string of backup codes
 * @returns Array of backup codes
 */
const decodeBackupCodes = (encodedCodes) => {
    try {
        return JSON.parse(encodedCodes);
    }
    catch {
        return [];
    }
};
exports.decodeBackupCodes = decodeBackupCodes;
/**
 * Verify backup code and remove it from the list
 * @param code - Backup code provided by user
 * @param encodedCodes - JSON string of stored backup codes
 * @returns Object with verification result and updated codes
 */
const verifyBackupCode = (code, encodedCodes) => {
    const codes = (0, exports.decodeBackupCodes)(encodedCodes);
    const normalizedCode = code.toUpperCase().replaceAll(/\s/g, "");
    const codeIndex = codes.findIndex((c) => c === normalizedCode);
    if (codeIndex === -1) {
        return { isValid: false, updatedCodes: encodedCodes };
    }
    // Remove the used backup code
    codes.splice(codeIndex, 1);
    const updatedCodes = (0, exports.encodeBackupCodes)(codes);
    return { isValid: true, updatedCodes };
};
exports.verifyBackupCode = verifyBackupCode;
/**
 * Check if user has remaining backup codes
 * @param encodedCodes - JSON string of stored backup codes
 * @returns Number of remaining backup codes
 */
const getRemainingBackupCodesCount = (encodedCodes) => {
    const codes = (0, exports.decodeBackupCodes)(encodedCodes);
    return codes.length;
};
exports.getRemainingBackupCodesCount = getRemainingBackupCodesCount;
