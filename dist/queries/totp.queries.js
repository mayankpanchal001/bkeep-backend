"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regenerateUserBackupCodes = exports.updateAuthenticatorLastUsed = exports.getUnverifiedTotpAuthenticator = exports.getUserTotpAuthenticator = exports.updateUserBackupCodes = exports.disableUserTotp = exports.verifyAndEnableUserTotp = exports.setupUserTotp = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const User_1 = require("../models/User");
const UserAuthenticator_1 = require("../models/UserAuthenticator");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
/**
 * Setup TOTP for user (create authenticator)
 * @param userId - User ID
 * @param secret - TOTP secret
 * @param backupCodes - JSON encoded backup codes
 * @param userAgent - User agent string
 * @param ipAddress - IP address
 * @returns Created UserAuthenticator object
 * @throws ApiError if user not found
 */
const setupUserTotp = async (userId, secret, backupCodes, userAgent, ipAddress) => {
    // Verify user exists
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Deactivate any existing authenticators for this user
    await UserAuthenticator_1.UserAuthenticator.query()
        .modify("notDeleted")
        .where("user_id", userId)
        .patch({
        isActive: false,
    });
    // Create new authenticator (unverified)
    const authenticator = await UserAuthenticator_1.UserAuthenticator.query().insert({
        userId,
        type: "totp",
        secret,
        backupCodes,
        isActive: false, // Not active until verified
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
    });
    return authenticator;
};
exports.setupUserTotp = setupUserTotp;
/**
 * Verify and enable TOTP for user
 * @param userId - User ID
 * @param authenticatorId - Optional authenticator ID (if not provided, uses the latest unverified one)
 * @returns Verified UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
const verifyAndEnableUserTotp = async (userId, authenticatorId) => {
    // Verify user exists
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Find the authenticator
    let authenticator;
    if (authenticatorId) {
        authenticator = await UserAuthenticator_1.UserAuthenticator.query()
            .modify("notDeleted")
            .modify("byUser", userId)
            .findById(authenticatorId);
    }
    else {
        // Find the most recent unverified authenticator
        authenticator = await UserAuthenticator_1.UserAuthenticator.query()
            .modify("notDeleted")
            .modify("byUser", userId)
            .modify("unverified")
            .orderBy("created_at", "desc")
            .first();
    }
    if (!authenticator) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_SETUP_REQUIRED);
    }
    // Activate and verify the authenticator
    await authenticator.$query().patch({
        isActive: true,
        verifiedAt: (0, date_1.getCurrentISOString)(),
    });
    // Enable MFA on user account
    await user.$query().patch({
        mfaEnabled: true,
    });
    return authenticator;
};
exports.verifyAndEnableUserTotp = verifyAndEnableUserTotp;
/**
 * Disable TOTP for user
 * @param userId - User ID
 * @returns Updated User object
 * @throws ApiError if user not found
 */
const disableUserTotp = async (userId) => {
    // Verify user exists
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Soft delete all authenticators for this user
    await UserAuthenticator_1.UserAuthenticator.query()
        .modify("notDeleted")
        .where("user_id", userId)
        .patch({
        deletedAt: (0, date_1.getCurrentISOString)(),
    });
    // Disable MFA on user account
    await user.$query().patch({
        mfaEnabled: false,
    });
    return user;
};
exports.disableUserTotp = disableUserTotp;
/**
 * Update user backup codes
 * @param userId - User ID
 * @param backupCodes - JSON encoded backup codes
 * @returns Updated UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
const updateUserBackupCodes = async (userId, backupCodes) => {
    // Find active TOTP authenticator
    const authenticator = await UserAuthenticator_1.UserAuthenticator.findActiveByUserAndType(userId, "totp");
    if (!authenticator) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED);
    }
    // Update backup codes
    await authenticator.$query().patch({
        backupCodes,
    });
    return authenticator;
};
exports.updateUserBackupCodes = updateUserBackupCodes;
/**
 * Get active TOTP authenticator for user
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
const getUserTotpAuthenticator = async (userId) => {
    return UserAuthenticator_1.UserAuthenticator.findActiveByUserAndType(userId, "totp");
};
exports.getUserTotpAuthenticator = getUserTotpAuthenticator;
/**
 * Get unverified TOTP authenticator for user
 * Used during TOTP verification process
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
const getUnverifiedTotpAuthenticator = async (userId) => {
    return UserAuthenticator_1.UserAuthenticator.query()
        .modify("notDeleted")
        .modify("byUser", userId)
        .modify("byType", "totp")
        .modify("unverified")
        .orderBy("created_at", "desc")
        .first();
};
exports.getUnverifiedTotpAuthenticator = getUnverifiedTotpAuthenticator;
/**
 * Update authenticator last used timestamp
 * @param authenticatorId - Authenticator ID
 */
const updateAuthenticatorLastUsed = async (authenticatorId) => {
    await UserAuthenticator_1.UserAuthenticator.query()
        .findById(authenticatorId)
        .patch({
        lastUsedAt: (0, date_1.getCurrentISOString)(),
    });
};
exports.updateAuthenticatorLastUsed = updateAuthenticatorLastUsed;
/**
 * Regenerate backup codes for user
 * @param userId - User ID
 * @param newBackupCodes - JSON encoded new backup codes
 * @returns Updated UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
const regenerateUserBackupCodes = async (userId, newBackupCodes) => {
    return (0, exports.updateUserBackupCodes)(userId, newBackupCodes);
};
exports.regenerateUserBackupCodes = regenerateUserBackupCodes;
