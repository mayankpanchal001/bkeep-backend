"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTotp = exports.getMfaStatus = exports.disableMfa = exports.enableMfa = exports.verifyMfa = exports.updateProfile = exports.getProfile = exports.changePassword = exports.resetPassword = exports.forgotPassword = exports.logout = exports.refreshToken = exports.login = void 0;
const node_crypto_1 = require("node:crypto");
const bcrypt_1 = __importDefault(require("bcrypt"));
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const audit_1 = require("../constants/audit");
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const security_1 = require("../constants/security");
const success_1 = require("../constants/success");
const User_1 = require("../models/User");
const authenticator_queries_1 = require("../queries/authenticator.queries");
const mfa_queries_1 = require("../queries/mfa.queries");
const passwordReset_queries_1 = require("../queries/passwordReset.queries");
const refreshToken_queries_1 = require("../queries/refreshToken.queries");
const user_queries_1 = require("../queries/user.queries");
const audit_service_1 = require("../services/audit.service");
const mailQueue_service_1 = require("../services/mailQueue.service");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const jwt_1 = require("../utils/jwt");
const totp_1 = require("../utils/totp");
/**
 * Login controller
 * Authenticates user with email and password, returns JWT tokens
 */
exports.login = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    // Validate credentials and get user
    const user = await (0, user_queries_1.findUserByEmailAndPassword)({ email, password });
    // Check if MFA is enabled for this user
    if (user.mfaEnabled) {
        // Check if user has active TOTP authenticator
        const authenticator = await (0, authenticator_queries_1.getUserTotpAuthenticator)(user.id);
        if (authenticator?.isActiveAndVerified()) {
            // Return response indicating TOTP is required
            res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, "TOTP verification required", {
                requiresMfa: true,
                mfaType: security_1.MFA_TYPE.TOTP,
                email: user.email,
            }));
            return;
        }
        // Email OTP flow (existing)
        // Generate 6-digit OTP using cryptographically secure random number
        const otpCode = (0, node_crypto_1.randomInt)(100000, 999999).toString();
        // Store OTP in database
        try {
            await (0, mfa_queries_1.createMfaOtp)(user.id, otpCode, security_1.SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES, req.headers["user-agent"] ?? null, req.ip ?? null);
        }
        catch (error) {
            logger_1.default.error("Failed to create MFA OTP:", error);
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.MFA_OTP_GENERATION_FAILED);
        }
        // Send OTP email via queue
        try {
            await (0, mailQueue_service_1.queueMfaOtpEmail)({
                to: user.email,
                otpCode,
                expiryMinutes: security_1.SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES,
                userName: user.name,
            });
            logger_1.default.info(`MFA OTP email queued for ${user.email}`);
        }
        catch (error) {
            // Log error but don't fail the request (security: don't reveal if email exists)
            logger_1.default.error("Failed to queue MFA OTP email:", error);
        }
        // Return response indicating MFA is required
        res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_OTP_SENT, {
            requiresMfa: true,
            mfaType: security_1.MFA_TYPE.EMAIL,
            email: user.email,
        }));
        return;
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
    // Store user session data in session store
    // This will automatically save the session to the database via connect-session-knex
    // Modifying req.session automatically triggers a save when resave: false
    const session = req.session;
    session.user = payload;
    // Set tokens in HTTP-only cookies
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };
    // Prepare user response data (exclude sensitive fields)
    const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleData,
        permissions: permissionsData,
        tenants: tenantsData,
        selectedTenantId: primaryTenant.id,
    };
    // Prepare login response data
    const responseData = {
        accessToken,
        refreshToken,
        user: userData,
    };
    // Audit log for login
    try {
        const requestContext = (0, audit_service_1.extractRequestContext)(req);
        await (0, audit_service_1.auditAction)(audit_1.AUDIT_ACTIONS.USER_LOGGED_IN, [
            {
                type: audit_1.AUDIT_ENTITY_TYPES.USER,
                id: user.id,
                name: user.name,
            },
        ], {
            requestContext,
            tenantId: primaryTenant.id,
            actor: {
                type: "user",
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for user login:", error);
        // Don't fail the request if audit logging fails
    }
    res
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.LOGIN_SUCCESSFUL, responseData));
});
/**
 * Refresh token controller
 * Renews access token and refresh token using a valid refresh token
 */
exports.refreshToken = (0, asyncHandler_1.default)(async (req, res) => {
    // Get refresh token from cookie or request body
    const refreshTokenFromRequest = req.cookies?.["refreshToken"] ?? req.body?.["refreshToken"];
    if (!refreshTokenFromRequest) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED);
    }
    // Verify refresh token JWT
    let tokenPayload;
    try {
        tokenPayload = await (0, jwt_1.verifyRefreshToken)(refreshTokenFromRequest);
    }
    catch {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.INVALID_TOKEN);
    }
    // Check if refresh token exists in database and is valid
    const storedRefreshToken = await (0, refreshToken_queries_1.findRefreshTokenByToken)(refreshTokenFromRequest);
    if (!storedRefreshToken) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.INVALID_TOKEN);
    }
    // Get user with all relations (roles, permissions, tenant)
    const userWithRelations = await (0, user_queries_1.findUserByIdComplete)(tokenPayload.id);
    // Extract roles and permissions
    const roles = userWithRelations.roles ?? [];
    const allPermissions = new Set();
    roles.forEach((role) => {
        if (role.permissions) {
            role.permissions.forEach((permission) => {
                // Only include active, non-deleted permissions
                if (permission.isActive && !permission.deletedAt) {
                    allPermissions.add(permission.name);
                }
            });
        }
    });
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
    // Build JWT user payload
    const payload = {
        id: userWithRelations.id,
        name: userWithRelations.name,
        email: userWithRelations.email,
        role: primaryRole.name,
        permissions: Array.from(allPermissions),
        selectedTenantId: primaryTenant.id,
    };
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = (0, jwt_1.signTokens)(payload);
    // Revoke old refresh token
    await (0, refreshToken_queries_1.revokeRefreshToken)(refreshTokenFromRequest);
    // Store new refresh token in database
    await (0, refreshToken_queries_1.createRefreshToken)({
        userId: userWithRelations.id,
        token: newRefreshToken,
        userAgent: req.headers["user-agent"] ?? null,
        ipAddress: req.ip ?? null,
    });
    // Update session with new user data
    const session = req.session;
    session.user = payload;
    // Set tokens in HTTP-only cookies
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };
    // Prepare refresh token response data
    const responseData = {
        accessToken,
        refreshToken: newRefreshToken,
    };
    res
        .cookie("refreshToken", newRefreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TOKEN_REFRESHED, responseData));
});
/**
 * Logout controller
 * Revokes refresh token and clears authentication cookies
 */
exports.logout = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Clear authentication cookies
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };
    // Revoke all refresh tokens for the user (logout from all devices)
    if (user) {
        await (0, refreshToken_queries_1.revokeAllRefreshTokensForUser)(user.id);
        // Audit log for logout
        try {
            const requestContext = (0, audit_service_1.extractRequestContext)(req);
            const tenantId = user.selectedTenantId;
            if (tenantId) {
                await (0, audit_service_1.auditAction)(audit_1.AUDIT_ACTIONS.USER_LOGGED_OUT, [
                    {
                        type: audit_1.AUDIT_ENTITY_TYPES.USER,
                        id: user.id,
                        name: user.name,
                    },
                ], {
                    requestContext,
                    tenantId,
                    actor: {
                        type: "user",
                        id: user.id,
                        email: user.email,
                    },
                });
            }
        }
        catch (error) {
            logger_1.default.error("Failed to create audit log for user logout:", error);
            // Don't fail the request if audit logging fails
        }
    }
    req.session.destroy((err) => {
        if (err) {
            logger_1.default.error("Error destroying session:", err);
        }
    });
    res
        .clearCookie("refreshToken", cookieOptions)
        .clearCookie("accessToken", cookieOptions)
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.LOGOUT_SUCCESSFUL, {}));
});
/**
 * Forgot password controller
 * Generates a secure token and stores it for password reset
 */
exports.forgotPassword = (0, asyncHandler_1.default)(async (req, res) => {
    const { email } = req.body;
    // Find user by email
    const user = await User_1.User.findByEmail(email);
    // Always return success to prevent email enumeration
    // Don't reveal if email exists or not
    if (!user) {
        res
            .status(http_1.HTTP_STATUS.OK)
            .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT, {}));
        return;
    }
    // Generate secure random token using crypto
    const plainToken = (0, node_crypto_1.randomBytes)(32).toString("hex");
    // Hash the token using SHA-256 before storing
    const hashedToken = (0, node_crypto_1.createHash)("sha256").update(plainToken).digest("hex");
    // Store password reset token (hashed version)
    await (0, passwordReset_queries_1.createPasswordResetToken)({
        email: user.email,
        token: hashedToken,
        expiresInMinutes: security_1.SECURITY_RULES.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
    });
    // Send password reset email via queue
    try {
        const resetUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${plainToken}&email=${encodeURIComponent(user.email)}`;
        await (0, mailQueue_service_1.queuePasswordResetEmail)({
            to: user.email,
            resetUrl,
            expiryMinutes: security_1.SECURITY_RULES.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
            userName: user.name,
        });
        logger_1.default.info(`Password reset email queued for ${user.email}`);
    }
    catch (error) {
        // Log error but don't fail the request (security: don't reveal if email exists)
        logger_1.default.error("Failed to queue password reset email:", error);
    }
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT, {}));
});
/**
 * Reset password controller
 * Validates token and updates user password
 */
exports.resetPassword = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, token, password } = req.body;
    // Find user by email
    const user = await User_1.User.findByEmail(email);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Hash the provided token to compare with stored hash
    const hashedToken = (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
    // Find password reset token (compare hashed tokens)
    const passwordReset = await (0, passwordReset_queries_1.findPasswordResetToken)(email, hashedToken);
    if (!passwordReset) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.INVALID_RESET_TOKEN);
    }
    // Hash new password
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    // Update user password
    await (0, user_queries_1.updateUserPassword)(user.id, passwordHash);
    // Revoke the used password reset token (use hashed token)
    await (0, passwordReset_queries_1.revokePasswordResetToken)(hashedToken);
    // Send password reset success email via queue
    try {
        const loginUrl = `${env_1.env.FRONTEND_URL}/login`;
        await (0, mailQueue_service_1.queuePasswordResetSuccessEmail)({
            to: user.email,
            userName: user.name,
            loginUrl,
        });
        logger_1.default.info(`Password reset success email queued for ${user.email}`);
    }
    catch (error) {
        // Log error but don't fail the request
        logger_1.default.error("Failed to queue password reset success email:", error);
    }
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESSFUL, {}));
});
/**
 * Change password controller
 * Updates user password after verifying current password
 */
exports.changePassword = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated body data
    const { currentPassword, newPassword } = req.validatedData;
    // Find user by ID
    const userDetails = await User_1.User.query()
        .modify("notDeleted")
        .findById(user.id);
    if (!userDetails) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Verify current password
    const isPasswordValid = await bcrypt_1.default.compare(currentPassword, userDetails.passwordHash);
    if (!isPasswordValid) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD);
    }
    // Hash new password
    const passwordHash = await bcrypt_1.default.hash(newPassword, 10);
    // Update user password
    await (0, user_queries_1.updateUserPassword)(user.id, passwordHash);
    // Send password change success email via queue
    try {
        const loginUrl = `${env_1.env.FRONTEND_URL}/login`;
        await (0, mailQueue_service_1.queuePasswordResetSuccessEmail)({
            to: userDetails.email,
            userName: userDetails.name,
            loginUrl,
        });
        logger_1.default.info(`Password change success email queued for ${userDetails.email}`);
    }
    catch (error) {
        // Log error but don't fail the request
        logger_1.default.error("Failed to queue password change success email:", error);
    }
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.PASSWORD_CHANGED, {}));
});
/**
 * Get user profile controller
 * Retrieves the current authenticated user's complete information
 */
exports.getProfile = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
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
    // Prepare user response data (exclude sensitive fields)
    const userData = {
        id: userWithRelations.id,
        email: userWithRelations.email,
        name: userWithRelations.name,
        role: roleData,
        permissions: permissionsData,
        tenants: tenantsData,
        selectedTenantId: primaryTenant.id,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USER_PROFILE_RETRIEVED, userData));
});
/**
 * Update user profile controller
 * Updates the current authenticated user's profile information
 */
exports.updateProfile = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated body data
    const { name } = req.validatedData;
    // Update user profile (only name can be updated)
    const updatedUser = await (0, user_queries_1.updateUserProfile)(user.id, { name });
    // Get updated user with all relations (roles, permissions, tenant)
    const userWithRelations = await (0, user_queries_1.findUserByIdComplete)(updatedUser.id);
    // Extract roles and permissions
    const roles = userWithRelations.roles ?? [];
    const allPermissionsMap = new Map();
    roles.forEach((role) => {
        if (role.permissions) {
            role.permissions.forEach((permission) => {
                // Only include active, non-deleted permissions
                // Use Map to avoid duplicates (same permission from multiple roles)
                if (permission.isActive && !permission.deletedAt) {
                    if (!allPermissionsMap.has(permission.name)) {
                        allPermissionsMap.set(permission.name, permission);
                    }
                }
            });
        }
    });
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
    // Prepare user response data (exclude sensitive fields)
    const userData = {
        id: userWithRelations.id,
        email: userWithRelations.email,
        name: userWithRelations.name,
        role: roleData,
        permissions: permissionsData,
        tenants: tenantsData,
        selectedTenantId: primaryTenant.id,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USER_PROFILE_UPDATED, userData));
});
/**
 * MFA verify controller
 * Verifies OTP and completes login for users with MFA enabled
 */
exports.verifyMfa = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, code } = req.body;
    // Find user by email
    const user = await User_1.User.findByEmail(email);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Check if user has MFA enabled
    if (!user.mfaEnabled) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_NOT_ENABLED);
    }
    // Verify OTP
    await (0, mfa_queries_1.verifyMfaOtp)(user.id, code);
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
    // Store user session data in session store (includes tenants for quick access)
    const session = req.session;
    session.user = payload;
    // Set tokens in HTTP-only cookies
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };
    // Prepare user response data (exclude sensitive fields)
    const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleData,
        permissions: permissionsData,
        tenants: tenantsData,
        selectedTenantId: primaryTenant.id,
    };
    // Prepare login response data
    const responseData = {
        accessToken,
        refreshToken,
        user: userData,
    };
    // Audit log for login (MFA OTP)
    try {
        const requestContext = (0, audit_service_1.extractRequestContext)(req);
        await (0, audit_service_1.auditAction)(audit_1.AUDIT_ACTIONS.USER_LOGGED_IN, [
            {
                type: audit_1.AUDIT_ENTITY_TYPES.USER,
                id: user.id,
                name: user.name,
            },
        ], {
            requestContext,
            tenantId: primaryTenant.id,
            actor: {
                type: "user",
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for user login (MFA OTP):", error);
        // Don't fail the request if audit logging fails
    }
    res
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_VERIFIED, responseData));
});
/**
 * Enable email OTP MFA controller
 * Enables email-based OTP for the authenticated user
 */
exports.enableMfa = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Update MFA status to enabled
    const updatedUser = await (0, user_queries_1.updateUserMfaStatus)(user.id, true);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_ENABLED, {
        mfaEnabled: updatedUser.mfaEnabled,
    }));
});
/**
 * Disable email OTP MFA controller
 * Disables email-based OTP for the authenticated user
 */
exports.disableMfa = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Update MFA status to disabled
    const updatedUser = await (0, user_queries_1.updateUserMfaStatus)(user.id, false);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_DISABLED, {
        mfaEnabled: updatedUser.mfaEnabled,
    }));
});
/**
 * Get MFA status controller
 * Retrieves the current MFA status for the authenticated user
 */
exports.getMfaStatus = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get user with MFA status
    const userWithMfa = await (0, user_queries_1.findUserById)(user.id);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_STATUS_RETRIEVED, {
        mfaEnabled: userWithMfa.mfaEnabled,
    }));
});
/**
 * Verify TOTP code controller (for login)
 * Verifies TOTP code or backup code and completes login
 */
exports.verifyTotp = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, code, isBackupCode } = req.body;
    // Find user by email
    const user = await User_1.User.findByEmail(email);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Check if user has MFA enabled
    if (!user.mfaEnabled) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_NOT_ENABLED);
    }
    // Get user's active authenticator
    const authenticator = await (0, authenticator_queries_1.getUserTotpAuthenticator)(user.id);
    if (!authenticator?.isActiveAndVerified()) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED);
    }
    let isValid = false;
    // Verify backup code if specified
    if (isBackupCode) {
        if (!authenticator.backupCodes) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID);
        }
        const { isValid: backupCodeValid, updatedCodes } = (0, totp_1.verifyBackupCode)(code, authenticator.backupCodes);
        if (!backupCodeValid) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID);
        }
        // Update backup codes (remove used code)
        await (0, authenticator_queries_1.updateUserBackupCodes)(user.id, updatedCodes);
        isValid = true;
    }
    else {
        // Verify TOTP code
        isValid = (0, totp_1.verifyTotpToken)(code, authenticator.secret);
        if (!isValid) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.MFA_TOTP_INVALID);
        }
    }
    // Update last used timestamp
    if (isValid) {
        await (0, authenticator_queries_1.updateAuthenticatorLastUsed)(authenticator.id);
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
    // Store user session data in session store (includes tenants for quick access)
    const session = req.session;
    session.user = payload;
    // Set tokens in HTTP-only cookies
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };
    // Prepare user response data (exclude sensitive fields)
    const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleData,
        permissions: permissionsData,
        tenants: tenantsData,
        selectedTenantId: primaryTenant.id,
    };
    // Prepare login response data
    const responseData = {
        accessToken,
        refreshToken,
        user: userData,
    };
    // Audit log for login (TOTP)
    try {
        const requestContext = (0, audit_service_1.extractRequestContext)(req);
        await (0, audit_service_1.auditAction)(audit_1.AUDIT_ACTIONS.USER_LOGGED_IN, [
            {
                type: audit_1.AUDIT_ENTITY_TYPES.USER,
                id: user.id,
                name: user.name,
            },
        ], {
            requestContext,
            tenantId: primaryTenant.id,
            actor: {
                type: "user",
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for user login (TOTP):", error);
        // Don't fail the request if audit logging fails
    }
    res
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_VERIFIED, responseData));
});
