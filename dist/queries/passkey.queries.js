"use strict";
/**
 * Passkey Query Functions
 * Database operations for WebAuthn/FIDO2 passkey credentials
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPasskeyStats = exports.renamePasskey = exports.activatePasskey = exports.deactivatePasskey = exports.deletePasskey = exports.updatePasskeyLastUsed = exports.updatePasskeyCounter = exports.updatePasskey = exports.countPasskeysByUserId = exports.findPasskeysByUserId = exports.findPasskeyByCredentialId = exports.findPasskeyById = exports.createPasskey = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const passkey_1 = require("../constants/passkey");
const UserPasskey_1 = require("../models/UserPasskey");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
/**
 * Create a new passkey credential
 */
const createPasskey = async (data) => {
    try {
        // Build the insert object with all provided fields
        const insertData = {
            userId: data.userId,
            credentialId: data.credentialId,
            publicKey: data.publicKey,
            counter: data.counter,
            credentialType: data.credentialType,
            name: data.name,
            backupEligible: data.backupEligible,
            backupState: data.backupState,
            isActive: true,
            ...(data.transports && { transports: data.transports }),
            ...(data.aaguid && { aaguid: data.aaguid }),
            ...(data.userAgent && { userAgent: data.userAgent }),
            ...(data.ipAddress && { ipAddress: data.ipAddress }),
        };
        const passkey = await UserPasskey_1.UserPasskey.query().insert(insertData);
        return passkey;
    }
    catch {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.PASSKEY_CREATION_FAILED);
    }
};
exports.createPasskey = createPasskey;
/**
 * Find passkey by ID
 */
const findPasskeyById = async (id) => {
    return UserPasskey_1.UserPasskey.query().modify("notDeleted").findById(id);
};
exports.findPasskeyById = findPasskeyById;
/**
 * Find passkey by credential ID
 */
const findPasskeyByCredentialId = async (credentialId) => {
    return UserPasskey_1.UserPasskey.findByCredentialId(credentialId);
};
exports.findPasskeyByCredentialId = findPasskeyByCredentialId;
/**
 * Find all active passkeys for a user
 */
const findPasskeysByUserId = async (userId) => {
    return UserPasskey_1.UserPasskey.findActiveByUser(userId);
};
exports.findPasskeysByUserId = findPasskeysByUserId;
/**
 * Count active passkeys for a user
 */
const countPasskeysByUserId = async (userId) => {
    return UserPasskey_1.UserPasskey.countActiveByUser(userId);
};
exports.countPasskeysByUserId = countPasskeysByUserId;
/**
 * Update passkey data
 */
const updatePasskey = async (id, data) => {
    const passkey = await (0, exports.findPasskeyById)(id);
    if (!passkey) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.PASSKEY_NOT_FOUND);
    }
    const updatedPasskey = await UserPasskey_1.UserPasskey.query()
        .patchAndFetchById(id, {
        ...data,
        updatedAt: (0, date_1.getCurrentISOString)(),
    })
        .modify("notDeleted");
    return updatedPasskey;
};
exports.updatePasskey = updatePasskey;
/**
 * Update passkey counter (after successful authentication)
 */
const updatePasskeyCounter = async (id, counter) => {
    await UserPasskey_1.UserPasskey.query()
        .findById(id)
        .patch({
        counter,
        lastUsedAt: (0, date_1.getCurrentISOString)(),
        updatedAt: (0, date_1.getCurrentISOString)(),
    });
};
exports.updatePasskeyCounter = updatePasskeyCounter;
/**
 * Update passkey last used timestamp
 */
const updatePasskeyLastUsed = async (id) => {
    await UserPasskey_1.UserPasskey.query()
        .findById(id)
        .patch({
        lastUsedAt: (0, date_1.getCurrentISOString)(),
        updatedAt: (0, date_1.getCurrentISOString)(),
    });
};
exports.updatePasskeyLastUsed = updatePasskeyLastUsed;
/**
 * Soft delete a passkey
 */
const deletePasskey = async (id, userId) => {
    const passkey = await (0, exports.findPasskeyById)(id);
    if (!passkey) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.PASSKEY_NOT_FOUND);
    }
    // Verify ownership
    if (passkey.userId !== userId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.FORBIDDEN);
    }
    // Soft delete
    const deletedPasskey = await UserPasskey_1.UserPasskey.query().patchAndFetchById(id, {
        deletedAt: (0, date_1.getCurrentISOString)(),
        updatedAt: (0, date_1.getCurrentISOString)(),
    });
    return deletedPasskey;
};
exports.deletePasskey = deletePasskey;
/**
 * Deactivate a passkey (without deleting)
 */
const deactivatePasskey = async (id, userId) => {
    const passkey = await (0, exports.findPasskeyById)(id);
    if (!passkey) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.PASSKEY_NOT_FOUND);
    }
    // Verify ownership
    if (passkey.userId !== userId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.FORBIDDEN);
    }
    return (0, exports.updatePasskey)(id, { isActive: false });
};
exports.deactivatePasskey = deactivatePasskey;
/**
 * Activate a passkey
 */
const activatePasskey = async (id, userId) => {
    const passkey = await (0, exports.findPasskeyById)(id);
    if (!passkey) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.PASSKEY_NOT_FOUND);
    }
    // Verify ownership
    if (passkey.userId !== userId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.FORBIDDEN);
    }
    return (0, exports.updatePasskey)(id, { isActive: true });
};
exports.activatePasskey = activatePasskey;
/**
 * Rename a passkey
 */
const renamePasskey = async (id, userId, name) => {
    const passkey = await (0, exports.findPasskeyById)(id);
    if (!passkey) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.PASSKEY_NOT_FOUND);
    }
    // Verify ownership
    if (passkey.userId !== userId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.FORBIDDEN);
    }
    return (0, exports.updatePasskey)(id, { name });
};
exports.renamePasskey = renamePasskey;
/**
 * Get passkey statistics for a user
 */
const getPasskeyStats = async (userId) => {
    const passkeys = await (0, exports.findPasskeysByUserId)(userId);
    // Find the most recent lastUsedAt timestamp
    let lastUsed;
    for (const p of passkeys) {
        if (p.lastUsedAt) {
            if (!lastUsed || p.lastUsedAt > lastUsed) {
                lastUsed = p.lastUsedAt;
            }
        }
    }
    const stats = {
        total: passkeys.length,
        active: passkeys.filter((p) => p.isActive).length,
        platform: passkeys.filter((p) => p.credentialType === passkey_1.PASSKEY_CREDENTIAL_TYPES.PLATFORM).length,
        roaming: passkeys.filter((p) => p.credentialType === passkey_1.PASSKEY_CREDENTIAL_TYPES.ROAMING).length,
    };
    // Conditionally add lastUsed only if it has a value
    if (lastUsed) {
        stats.lastUsed = lastUsed;
    }
    return stats;
};
exports.getPasskeyStats = getPasskeyStats;
