"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpiredPasswordResetTokens = exports.revokePasswordResetTokensByEmail = exports.revokePasswordResetToken = exports.findPasswordResetTokenByToken = exports.findPasswordResetToken = exports.createPasswordResetToken = void 0;
const PasswordReset_1 = require("../models/PasswordReset");
const date_1 = require("../utils/date");
/**
 * Create and store a password reset token in the database
 * @param data - Password reset token data
 * @returns Created PasswordReset instance
 */
const createPasswordResetToken = async (data) => {
    const { email, token, expiresInMinutes = 60 } = data;
    // Calculate expiry time (default: 60 minutes from now)
    const expiresAt = (0, date_1.getCurrentMoment)()
        .add(expiresInMinutes, "minutes")
        .toDate();
    // Revoke any existing password reset tokens for this email
    await (0, exports.revokePasswordResetTokensByEmail)(email);
    // Create password reset token record
    const passwordReset = await PasswordReset_1.PasswordReset.query().insert({
        email,
        token,
        expiresAt: expiresAt.toISOString(),
    });
    return passwordReset;
};
exports.createPasswordResetToken = createPasswordResetToken;
/**
 * Find password reset token by email and token
 * @param email - User email
 * @param token - Reset token
 * @returns PasswordReset if found and valid, undefined otherwise
 */
const findPasswordResetToken = async (email, token) => {
    return PasswordReset_1.PasswordReset.findByEmailAndToken(email, token);
};
exports.findPasswordResetToken = findPasswordResetToken;
/**
 * Find password reset token by token only
 * @param token - Reset token
 * @returns PasswordReset if found and valid, undefined otherwise
 */
const findPasswordResetTokenByToken = async (token) => {
    return PasswordReset_1.PasswordReset.findByToken(token);
};
exports.findPasswordResetTokenByToken = findPasswordResetTokenByToken;
/**
 * Revoke a password reset token (soft delete)
 * @param token - Password reset token string
 * @returns Number of tokens revoked
 */
const revokePasswordResetToken = async (token) => {
    const revoked = await PasswordReset_1.PasswordReset.query()
        .modify("notDeleted")
        .where({ token })
        .patch({ deletedAt: (0, date_1.getCurrentISOString)() });
    return revoked;
};
exports.revokePasswordResetToken = revokePasswordResetToken;
/**
 * Revoke all password reset tokens for an email
 * @param email - User email
 * @returns Number of tokens revoked
 */
const revokePasswordResetTokensByEmail = async (email) => {
    const revoked = await PasswordReset_1.PasswordReset.query()
        .modify("notDeleted")
        .where({ email })
        .patch({ deletedAt: (0, date_1.getCurrentISOString)() });
    return revoked;
};
exports.revokePasswordResetTokensByEmail = revokePasswordResetTokensByEmail;
/**
 * Delete expired password reset tokens (hard delete for cleanup)
 * @returns Number of tokens deleted
 */
const deleteExpiredPasswordResetTokens = async () => {
    return PasswordReset_1.PasswordReset.deleteExpired();
};
exports.deleteExpiredPasswordResetTokens = deleteExpiredPasswordResetTokens;
