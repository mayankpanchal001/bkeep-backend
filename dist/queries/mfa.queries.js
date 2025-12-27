"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpiredMfaCodes = exports.verifyMfaOtp = exports.createMfaOtp = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const security_1 = require("../constants/security");
const MfaEmailOtp_1 = require("../models/MfaEmailOtp");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
/**
 * Create email OTP for user
 * @param userId - User ID
 * @param code - 6-digit OTP code
 * @param expiresInMinutes - Expiration time in minutes (default: MFA_OTP_EXPIRY_MINUTES)
 * @param userAgent - User agent string (optional)
 * @param ipAddress - IP address (optional)
 * @returns Created MfaEmailOtp object
 */
const createMfaOtp = async (userId, code, expiresInMinutes = security_1.SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES, userAgent, ipAddress) => {
    // Soft delete any existing email OTP codes for this user
    await MfaEmailOtp_1.MfaEmailOtp.query()
        .modify("notDeleted")
        .where("user_id", userId)
        .patch({
        deletedAt: (0, date_1.getCurrentISOString)(),
    });
    // Calculate expiration time (5 minutes by default)
    const expiresAt = (0, date_1.getCurrentMoment)()
        .add(expiresInMinutes, "minutes")
        .toDate();
    // Create new email OTP code
    const mfaOtp = await MfaEmailOtp_1.MfaEmailOtp.query().insert({
        userId,
        code,
        expiresAt: expiresAt.toISOString(),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
    });
    return mfaOtp;
};
exports.createMfaOtp = createMfaOtp;
/**
 * Verify email OTP
 * @param userId - User ID
 * @param code - 6-digit OTP code to verify
 * @returns MfaEmailOtp object if valid
 * @throws ApiError if email OTP code is invalid or expired
 */
const verifyMfaOtp = async (userId, code) => {
    // Find email OTP code by user ID and code
    const mfaOtp = await MfaEmailOtp_1.MfaEmailOtp.query()
        .modify("notDeleted")
        .where("user_id", userId)
        .where("code", code)
        .first();
    if (!mfaOtp) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.MFA_OTP_INVALID_OR_EXPIRED);
    }
    // Check if email OTP code has expired
    if (mfaOtp.isExpired()) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.MFA_OTP_INVALID_OR_EXPIRED);
    }
    // Soft delete the email OTP code after successful verification
    await mfaOtp.softDelete();
    return mfaOtp;
};
exports.verifyMfaOtp = verifyMfaOtp;
/**
 * Delete expired email OTP codes (cleanup method)
 * @returns Number of deleted email OTP codes
 */
const deleteExpiredMfaCodes = async () => {
    return MfaEmailOtp_1.MfaEmailOtp.deleteExpired();
};
exports.deleteExpiredMfaCodes = deleteExpiredMfaCodes;
