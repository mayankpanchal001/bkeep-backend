"use strict";
/**
 * Passkey Controller
 * Handles WebAuthn/FIDO2 passkey authentication operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPasskeysStats = exports.disablePasskey = exports.enablePasskey = exports.removePasskey = exports.updatePasskeyName = exports.getPasskey = exports.listPasskeys = exports.verifyAuthentication = exports.generateAuthenticationOptions = exports.verifyRegistration = exports.generateRegistrationOptions = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const User_1 = require("../models/User");
const passkey_queries_1 = require("../queries/passkey.queries");
const refreshToken_queries_1 = require("../queries/refreshToken.queries");
const user_queries_1 = require("../queries/user.queries");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const jwt_1 = require("../utils/jwt");
const webauthn_1 = require("../utils/webauthn");
/**
 * Interface for storing challenges temporarily
 * In production, use Redis or similar for distributed systems
 */
const challenges = new Map();
// Clean up expired challenges every 5 minutes
setInterval(() => {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    for (const [key, value] of challenges.entries()) {
        if (now - value.timestamp > FIVE_MINUTES) {
            challenges.delete(key);
        }
    }
}, 5 * 60 * 1000);
/**
 * Generate registration options for creating a new passkey
 * POST /api/auth/passkey/register/options
 */
exports.generateRegistrationOptions = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get user details
    const userDetails = await User_1.User.findByEmail(user.email);
    if (!userDetails) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Get existing passkeys for this user
    const existingPasskeys = await (0, passkey_queries_1.findPasskeysByUserId)(user.id);
    // Generate registration options
    const options = await (0, webauthn_1.generatePasskeyRegistrationOptions)(user.id, user.email, user.name, existingPasskeys
        .filter((p) => p.transports !== null && p.transports !== undefined)
        .map((p) => ({
        credentialId: p.credentialId,
        transports: p.transports,
    })));
    // Store challenge temporarily
    challenges.set(`reg-${user.id}`, {
        challenge: options.challenge,
        timestamp: Date.now(),
    });
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_REGISTRATION_OPTIONS_GENERATED, {
        options,
    }));
});
/**
 * Verify and register a new passkey
 * POST /api/auth/passkey/register/verify
 */
exports.verifyRegistration = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const { name, credential } = req.body;
    // Get stored challenge
    const storedChallenge = challenges.get(`reg-${user.id}`);
    if (!storedChallenge) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.PASSKEY_CHALLENGE_EXPIRED);
    }
    // Verify registration
    const verification = await (0, webauthn_1.verifyPasskeyRegistration)(credential, storedChallenge.challenge);
    if (!verification.verified || !verification.registrationInfo) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.PASSKEY_REGISTRATION_FAILED);
    }
    const { registrationInfo } = verification;
    // Extract credential data
    const credentialId = registrationInfo.credential.id;
    const publicKey = (0, webauthn_1.bufferToBase64url)(registrationInfo.credential.publicKey);
    // Determine credential type
    const credentialType = registrationInfo.credentialDeviceType === "singleDevice"
        ? "platform"
        : "roaming";
    // Create passkey record
    const createData = {
        userId: user.id,
        credentialId,
        publicKey,
        counter: registrationInfo.credential.counter,
        credentialType,
        name,
        backupEligible: registrationInfo.credentialBackedUp ?? false,
        backupState: registrationInfo.credentialBackedUp ?? false,
    };
    // Add optional properties only if they have values
    if (credential.response.transports) {
        createData.transports = credential.response.transports;
    }
    if (registrationInfo.aaguid) {
        createData.aaguid = (0, webauthn_1.bufferToBase64url)(Buffer.from(registrationInfo.aaguid, "hex"));
    }
    if (req.headers["user-agent"]) {
        createData.userAgent = req.headers["user-agent"];
    }
    if (req.ip) {
        createData.ipAddress = req.ip;
    }
    const passkey = await (0, passkey_queries_1.createPasskey)(createData);
    // Clean up challenge
    challenges.delete(`reg-${user.id}`);
    // Transform response (exclude internal fields)
    const passkeyData = {
        id: passkey.id,
        name: passkey.name,
        credentialType: passkey.credentialType,
        createdAt: passkey.createdAt,
    };
    res.status(http_1.HTTP_STATUS.CREATED).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.PASSKEY_REGISTERED, {
        passkey: passkeyData,
    }));
});
/**
 * Generate authentication options for logging in with a passkey
 * POST /api/auth/passkey/authenticate/options
 */
exports.generateAuthenticationOptions = (0, asyncHandler_1.default)(async (req, res) => {
    const { email } = req.body;
    let allowedCredentials = [];
    // If email provided, get user's passkeys
    if (email) {
        const user = await User_1.User.findByEmail(email);
        if (user) {
            const passkeys = await (0, passkey_queries_1.findPasskeysByUserId)(user.id);
            allowedCredentials = passkeys
                .filter((p) => p.transports !== null && p.transports !== undefined)
                .map((p) => ({
                credentialId: p.credentialId,
                transports: p.transports,
            }));
        }
    }
    // Generate authentication options
    const options = await (0, webauthn_1.generatePasskeyAuthenticationOptions)(allowedCredentials);
    // Store challenge temporarily
    const challengeKey = email ? `auth-${email}` : `auth-${options.challenge}`;
    challenges.set(challengeKey, {
        challenge: options.challenge,
        timestamp: Date.now(),
    });
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_AUTHENTICATION_OPTIONS_GENERATED, {
        options,
    }));
});
/**
 * Verify passkey authentication and complete login
 * POST /api/auth/passkey/authenticate/verify
 */
exports.verifyAuthentication = (0, asyncHandler_1.default)(async (req, res) => {
    const { credential } = req.body;
    // Find passkey by credential ID
    const passkey = await (0, passkey_queries_1.findPasskeyByCredentialId)(credential.id);
    if (!passkey) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.PASSKEY_INVALID_CREDENTIAL);
    }
    // Get stored challenge
    // Try both email-based and challenge-based keys
    const user = await User_1.User.query().findById(passkey.userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Decode clientDataJSON to extract the challenge
    const clientData = JSON.parse(Buffer.from(credential.response.clientDataJSON, "base64url").toString("utf-8"));
    const receivedChallenge = clientData.challenge;
    const storedChallenge = challenges.get(`auth-${user.email}`) ??
        challenges.get(`auth-${receivedChallenge}`);
    if (!storedChallenge) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.PASSKEY_CHALLENGE_EXPIRED);
    }
    // Prepare authenticator credential object
    const publicKeyBuffer = (0, webauthn_1.base64urlToBuffer)(passkey.publicKey);
    const authenticatorCredential = {
        id: passkey.credentialId, // Base64URLString
        publicKey: new Uint8Array(publicKeyBuffer),
        counter: passkey.counter,
    };
    // Conditionally add transports if available
    const finalAuthenticatorCredential = passkey.transports
        ? {
            ...authenticatorCredential,
            transports: passkey.transports,
        }
        : authenticatorCredential;
    // Verify authentication
    const verification = await (0, webauthn_1.verifyPasskeyAuthentication)(credential, storedChallenge.challenge, finalAuthenticatorCredential);
    if (!verification.verified || !verification.authenticationInfo) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.PASSKEY_AUTHENTICATION_FAILED);
    }
    // Update counter
    await (0, passkey_queries_1.updatePasskeyCounter)(passkey.id, verification.authenticationInfo.newCounter);
    // Clean up challenge
    challenges.delete(`auth-${user.email}`);
    // Check if user is active
    if (!user.isActive) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.ACCOUNT_DEACTIVATED);
    }
    // Get user with all relations (roles, permissions, tenant)
    const userWithRelations = await (0, user_queries_1.findUserByIdComplete)(user.id);
    // Extract roles and permissions
    const roles = userWithRelations.roles ?? [];
    const allPermissionsMap = new Map();
    roles.forEach((role) => {
        if (role.permissions) {
            role.permissions.forEach((permission) => {
                // Only include active, non-deleted permissions
                if (permission.isActive && !permission.deletedAt) {
                    if (!allPermissionsMap.has(permission.name)) {
                        allPermissionsMap.set(permission.name, permission);
                    }
                }
            });
        }
    });
    // Convert to array of permission names for JWT (keep lightweight)
    const permissionNames = Array.from(allPermissionsMap.keys());
    // Convert to detailed permission objects for response
    const permissionsData = Array.from(allPermissionsMap.values()).map((permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
    }));
    // Validate and extract primary role
    const primaryRole = roles[0];
    if (!primaryRole) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.USER_NO_ROLE);
    }
    // Get all tenants with is_primary flag
    const tenants = userWithRelations.tenants ?? [];
    const primaryTenant = tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0];
    if (!primaryTenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.USER_NO_TENANT);
    }
    // Extract role data
    const roleData = {
        id: primaryRole.id,
        name: primaryRole.name,
        displayName: primaryRole.displayName,
    };
    // Extract all tenants data with isPrimary flag
    const tenantsData = tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        isPrimary: tenant.userTenants?.isPrimary === true,
    }));
    // Build JWT user payload
    const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole.name,
        permissions: permissionNames,
        selectedTenantId: primaryTenant.id,
    };
    // Generate tokens
    const { accessToken, refreshToken } = (0, jwt_1.signTokens)(payload);
    // Store refresh token in database
    await (0, refreshToken_queries_1.createRefreshToken)({
        userId: user.id,
        token: refreshToken,
        userAgent: req.headers["user-agent"] ?? null,
        ipAddress: req.ip ?? null,
    });
    // Set tokens in HTTP-only cookies
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };
    // Prepare login response data
    const responseData = {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: roleData,
            permissions: permissionsData,
            tenants: tenantsData,
            selectedTenantId: primaryTenant.id,
        },
    };
    res
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_AUTHENTICATED, responseData));
});
/**
 * List all passkeys for the authenticated user
 * GET /api/auth/passkey
 */
exports.listPasskeys = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const passkeys = await (0, passkey_queries_1.findPasskeysByUserId)(user.id);
    // Transform response (exclude sensitive fields)
    const passkeysData = passkeys.map((p) => ({
        id: p.id,
        name: p.name,
        credentialType: p.credentialType,
        transports: p.transports ?? null,
        isActive: p.isActive,
        lastUsedAt: p.lastUsedAt,
        backupEligible: p.backupEligible,
        backupState: p.backupState,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    }));
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEYS_RETRIEVED, {
        passkeys: passkeysData,
        total: passkeysData.length,
    }));
});
/**
 * Get a single passkey by ID
 * GET /api/auth/passkey/:id
 */
exports.getPasskey = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!id) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.VALIDATION_FAILED);
    }
    const passkey = await (0, passkey_queries_1.findPasskeyById)(id);
    if (!passkey) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.PASSKEY_NOT_FOUND);
    }
    // Verify ownership
    if (passkey.userId !== user.id) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.FORBIDDEN);
    }
    // Transform response (exclude sensitive fields)
    const passkeyData = {
        id: passkey.id,
        name: passkey.name,
        credentialType: passkey.credentialType,
        transports: passkey.transports ?? null,
        isActive: passkey.isActive,
        lastUsedAt: passkey.lastUsedAt,
        backupEligible: passkey.backupEligible,
        backupState: passkey.backupState,
        createdAt: passkey.createdAt,
        updatedAt: passkey.updatedAt,
    };
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_RETRIEVED, {
        passkey: passkeyData,
    }));
});
/**
 * Rename a passkey
 * PATCH /api/auth/passkey/:id/rename
 */
exports.updatePasskeyName = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { name } = req.body;
    if (!id) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.VALIDATION_FAILED);
    }
    const updatedPasskey = await (0, passkey_queries_1.renamePasskey)(id, user.id, name);
    // Transform response
    const passkeyData = {
        id: updatedPasskey.id,
        name: updatedPasskey.name,
        updatedAt: updatedPasskey.updatedAt,
    };
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_RENAMED, {
        passkey: passkeyData,
    }));
});
/**
 * Delete a passkey
 * DELETE /api/auth/passkey/:id
 */
exports.removePasskey = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!id) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.VALIDATION_FAILED);
    }
    await (0, passkey_queries_1.deletePasskey)(id, user.id);
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_DELETED, {}));
});
/**
 * Enable a passkey
 * PATCH /api/auth/passkey/:id/enable
 */
exports.enablePasskey = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!id) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.VALIDATION_FAILED);
    }
    const updatedPasskey = await (0, passkey_queries_1.activatePasskey)(id, user.id);
    const passkeyData = {
        id: updatedPasskey.id,
        isActive: updatedPasskey.isActive,
        updatedAt: updatedPasskey.updatedAt,
    };
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_ACTIVATED, {
        passkey: passkeyData,
    }));
});
/**
 * Disable a passkey
 * PATCH /api/auth/passkey/:id/disable
 */
exports.disablePasskey = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!id) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.VALIDATION_FAILED);
    }
    const updatedPasskey = await (0, passkey_queries_1.deactivatePasskey)(id, user.id);
    const passkeyData = {
        id: updatedPasskey.id,
        isActive: updatedPasskey.isActive,
        updatedAt: updatedPasskey.updatedAt,
    };
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_DEACTIVATED, {
        passkey: passkeyData,
    }));
});
/**
 * Get passkey statistics for the authenticated user
 * GET /api/auth/passkey/stats
 */
exports.getPasskeysStats = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const stats = await (0, passkey_queries_1.getPasskeyStats)(user.id);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSKEY_STATS_RETRIEVED, {
        stats,
    }));
});
