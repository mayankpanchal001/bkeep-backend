"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpiredRefreshTokens = exports.revokeAllRefreshTokensForUser = exports.revokeRefreshToken = exports.findRefreshTokensByUserId = exports.findRefreshTokenByToken = exports.createRefreshToken = void 0;
const RefreshToken_1 = require("../models/RefreshToken");
const date_1 = require("../utils/date");
/**
 * Create and store a refresh token in the database
 * @param data - Refresh token data
 * @returns Created RefreshToken instance
 */
const createRefreshToken = async (data) => {
    const { userId, token, userAgent, ipAddress } = data;
    // Calculate token expiry from JWT
    const expiresAtDate = (0, RefreshToken_1.getTokenExpiry)(token);
    // Create refresh token record
    // Convert Date to ISO string for JSON schema validation
    // Objection.js will convert the ISO string to Date for the database
    const refreshToken = await RefreshToken_1.RefreshToken.query().insert({
        userId,
        token,
        expiresAt: expiresAtDate.toISOString(),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
    });
    return refreshToken;
};
exports.createRefreshToken = createRefreshToken;
/**
 * Find refresh token by token string
 * @param token - Refresh token string
 * @returns RefreshToken if found and valid, undefined otherwise
 */
const findRefreshTokenByToken = async (token) => {
    return RefreshToken_1.RefreshToken.findByToken(token);
};
exports.findRefreshTokenByToken = findRefreshTokenByToken;
/**
 * Find all valid refresh tokens for a user
 * @param userId - User ID
 * @returns Array of valid RefreshToken instances
 */
const findRefreshTokensByUserId = async (userId) => {
    return RefreshToken_1.RefreshToken.findByUserId(userId);
};
exports.findRefreshTokensByUserId = findRefreshTokensByUserId;
/**
 * Revoke a refresh token (soft delete)
 * @param token - Refresh token string
 * @returns Number of tokens revoked
 */
const revokeRefreshToken = async (token) => {
    const revoked = await RefreshToken_1.RefreshToken.query()
        .modify("notDeleted")
        .where({ token })
        .patch({ deletedAt: (0, date_1.getCurrentISOString)() });
    return revoked;
};
exports.revokeRefreshToken = revokeRefreshToken;
/**
 * Revoke all refresh tokens for a user
 * @param userId - User ID
 * @returns Number of tokens revoked
 */
const revokeAllRefreshTokensForUser = async (userId) => {
    return RefreshToken_1.RefreshToken.revokeAllForUser(userId);
};
exports.revokeAllRefreshTokensForUser = revokeAllRefreshTokensForUser;
/**
 * Delete expired refresh tokens (hard delete for cleanup)
 * @returns Number of tokens deleted
 */
const deleteExpiredRefreshTokens = async () => {
    return RefreshToken_1.RefreshToken.deleteExpired();
};
exports.deleteExpiredRefreshTokens = deleteExpiredRefreshTokens;
