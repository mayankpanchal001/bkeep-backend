"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadBackupCodes = exports.regenerateBackupCodes = exports.getTotpStatus = exports.disableTotp = exports.verifyAndEnableTotp = exports.setupTotp = void 0;
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const security_1 = require("../constants/security");
const success_1 = require("../constants/success");
const User_1 = require("../models/User");
const authenticator_queries_1 = require("../queries/authenticator.queries");
const mailQueue_service_1 = require("../services/mailQueue.service");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const totp_1 = require("../utils/totp");
/**
 * Setup TOTP authenticator controller
 * Generates TOTP secret and QR code for user to scan with authenticator app
 */
exports.setupTotp = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get user details
    const userDetails = await User_1.User.findByEmail(user.email);
    if (!userDetails) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Check if TOTP is already enabled
    const existingAuthenticator = await (0, authenticator_queries_1.getUserTotpAuthenticator)(user.id);
    if (existingAuthenticator?.isActiveAndVerified()) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_ALREADY_ENABLED);
    }
    // Generate TOTP secret
    const secret = (0, totp_1.generateTotpSecret)();
    // Generate QR code
    const qrCode = await (0, totp_1.generateTotpQrCode)(user.email, secret);
    // Generate backup codes
    const backupCodes = (0, totp_1.generateBackupCodes)();
    const encodedBackupCodes = (0, totp_1.encodeBackupCodes)(backupCodes);
    // Store secret and backup codes (but don't enable TOTP yet)
    await (0, authenticator_queries_1.setupUserTotp)(user.id, secret, encodedBackupCodes, req.headers["user-agent"] ?? null, req.ip ?? null);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_TOTP_SETUP_INITIATED, {
        secret,
        qrCode,
        backupCodes,
    }));
});
/**
 * Verify and enable TOTP authenticator controller
 * Verifies TOTP code and enables TOTP for the user
 */
exports.verifyAndEnableTotp = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const { code } = req.body;
    // Get user details
    const userDetails = await User_1.User.findByEmail(user.email);
    if (!userDetails) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Find the unverified authenticator
    const authenticator = await (0, authenticator_queries_1.getUnverifiedTotpAuthenticator)(user.id);
    if (!authenticator) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_SETUP_REQUIRED);
    }
    // Verify TOTP code
    const isValid = (0, totp_1.verifyTotpToken)(code, authenticator.secret);
    if (!isValid) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.MFA_TOTP_INVALID);
    }
    // Enable TOTP
    await (0, authenticator_queries_1.verifyAndEnableUserTotp)(user.id);
    // Send email notification about TOTP setup
    try {
        const recoveryCodesUrl = `${env_1.env.FRONTEND_URL}/auth/recovery-codes`;
        const disableTotpUrl = `${env_1.env.FRONTEND_URL}/settings/security`;
        await (0, mailQueue_service_1.queueTotpSetupEmail)({
            to: user.email,
            userName: userDetails.name,
            recoveryCodesUrl,
            disableTotpUrl,
        });
        logger_1.default.info("TOTP setup notification email queued", {
            userId: user.id,
            email: user.email,
        });
    }
    catch (error) {
        logger_1.default.error("Failed to queue TOTP setup notification email", {
            error,
            userId: user.id,
        });
        // Don't fail the request if email fails
    }
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_TOTP_ENABLED, {
        mfaEnabled: true,
        mfaType: security_1.MFA_TYPE.TOTP,
    }));
});
/**
 * Disable TOTP authenticator controller
 * Disables TOTP and removes secret and backup codes
 */
exports.disableTotp = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get user details
    const userDetails = await User_1.User.findByEmail(user.email);
    if (!userDetails) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Check if TOTP authenticator exists
    const authenticator = await (0, authenticator_queries_1.getUserTotpAuthenticator)(user.id);
    if (!authenticator?.isActiveAndVerified()) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED);
    }
    // Disable TOTP
    await (0, authenticator_queries_1.disableUserTotp)(user.id);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_TOTP_DISABLED, {
        mfaEnabled: false,
    }));
});
/**
 * Get TOTP status controller
 * Retrieves the current TOTP status for the authenticated user
 */
exports.getTotpStatus = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    const authenticator = await (0, authenticator_queries_1.getUserTotpAuthenticator)(user.id);
    const totpEnabled = authenticator?.isActiveAndVerified() ?? false;
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TOTP_STATUS_RETRIEVED, {
        totpEnabled,
        mfaEnabled: totpEnabled,
        mfaType: totpEnabled ? security_1.MFA_TYPE.TOTP : security_1.MFA_TYPE.EMAIL,
    }));
});
/**
 * Regenerate backup codes controller
 * Generates new backup codes for the authenticated user
 */
exports.regenerateBackupCodes = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Check if TOTP is enabled
    const authenticator = await (0, authenticator_queries_1.getUserTotpAuthenticator)(user.id);
    if (!authenticator?.isActiveAndVerified()) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED);
    }
    // Generate new backup codes
    const backupCodes = (0, totp_1.generateBackupCodes)();
    const encodedBackupCodes = (0, totp_1.encodeBackupCodes)(backupCodes);
    // Update backup codes
    await (0, authenticator_queries_1.regenerateUserBackupCodes)(user.id, encodedBackupCodes);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.MFA_BACKUP_CODES_GENERATED, {
        backupCodes,
    }));
});
/**
 * Download backup codes controller
 * Downloads remaining backup codes as a text file
 */
exports.downloadBackupCodes = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Check if TOTP is enabled
    const authenticator = await (0, authenticator_queries_1.getUserTotpAuthenticator)(user.id);
    if (!authenticator?.isActiveAndVerified()) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED);
    }
    // Check if backup codes exist
    if (!authenticator.backupCodes) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID);
    }
    // Decode backup codes
    const backupCodes = (0, totp_1.decodeBackupCodes)(authenticator.backupCodes);
    if (backupCodes.length === 0) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_BACKUP_CODE_INVALID);
    }
    // Format backup codes as text file
    const content = [
        "BKeep - Backup Codes",
        "",
        "These are your backup codes for two-factor authentication.",
        "Each code can only be used once.",
        "",
        "IMPORTANT: Store these codes in a safe place. If you lose access to your authenticator app, you can use these codes to sign in.",
        "",
        "Backup Codes:",
        ...backupCodes.map((code, index) => `${index + 1}. ${code}`),
        "",
        `Generated: ${new Date().toISOString()}`,
    ].join("\n");
    // Set response headers for file download
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", 'attachment; filename="bkeep-backup-codes.txt"');
    res.send(content);
});
