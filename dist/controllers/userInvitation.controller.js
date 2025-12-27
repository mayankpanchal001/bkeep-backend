"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendInvitation = exports.revokeInvitation = exports.acceptInvitation = exports.verifyInvitation = exports.inviteUser = exports.getAllInvitations = void 0;
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const security_1 = require("../constants/security");
const success_1 = require("../constants/success");
const user_queries_1 = require("../queries/user.queries");
const userInvitation_queries_1 = require("../queries/userInvitation.queries");
const shared_schema_1 = require("../schema/shared.schema");
const mailQueue_service_1 = require("../services/mailQueue.service");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all invitations controller
 * Retrieves pending invitations with pagination, sorting, and search
 * All users can only see invitations for their selected tenant
 */
exports.getAllInvitations = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    if (!user?.selectedTenantId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED);
    }
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch invitations with filters (filtered by tenant)
    const { invitations, total } = await (0, userInvitation_queries_1.findInvitations)(filters, user.selectedTenantId);
    // Transform invitations to response format (exclude sensitive fields)
    const items = invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.user?.email ?? "",
        userName: invitation.user?.name ?? "",
        tenant: {
            id: invitation.tenant?.id,
            name: invitation.tenant?.name,
        },
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
    }));
    // Get pagination metadata
    const pagination = (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total);
    // Prepare response data
    const responseData = {
        items,
        pagination,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.INVITATIONS_RETRIEVED, responseData));
});
/**
 * Invite user controller
 * Creates a user invitation for the specified tenant and roles
 * All users can only invite users for their selected tenant
 */
exports.inviteUser = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.USER_NOT_AUTHENTICATED);
    }
    if (!user.selectedTenantId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED);
    }
    // Get validated body data
    const { name, email, roleId } = req.body;
    // Create invitation
    const invitationData = {
        name,
        email,
        roleId,
        tenantId: user.selectedTenantId,
        invitedBy: user.id,
    };
    const { invitation, plainToken } = await (0, userInvitation_queries_1.createUserInvitation)(invitationData);
    // Send invitation email via queue
    try {
        // Fetch inviting user's name
        const invitingUser = await (0, user_queries_1.findUserById)(user.id);
        const acceptUrl = `${env_1.env.FRONTEND_URL}/accept-invitation?token=${plainToken}`;
        await (0, mailQueue_service_1.queueUserInvitationEmail)({
            to: invitation.user?.email ?? email,
            acceptUrl,
            tenantName: invitation.tenant?.name ?? "the organization",
            expiryDays: Math.floor(security_1.SECURITY_RULES.USER_INVITATION_TOKEN_EXPIRY_MINUTES / 60 / 24),
            userName: invitation.user?.name ?? name ?? "User",
            invitedBy: invitingUser.name,
        });
        logger_1.default.info(`Invitation email queued for ${invitation.user?.email ?? email}`);
    }
    catch (error) {
        // Log error but don't fail the request
        logger_1.default.error("Failed to queue invitation email:", error);
    }
    res.status(http_1.HTTP_STATUS.CREATED).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.USER_INVITED, {
        id: invitation.id,
        email: invitation.user?.email ?? email,
        tenant: {
            id: invitation.tenant?.id,
            name: invitation.tenant?.name,
        },
        createdAt: invitation.createdAt,
    }));
});
/**
 * Verify invitation token
 * Returns whether the invitation requires a password (new user) or not (existing user)
 * This helps the frontend decide whether to show a password field
 */
exports.verifyInvitation = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated query parameters
    const { token } = req.validatedData;
    // Verify invitation token
    const invitationStatus = await (0, userInvitation_queries_1.verifyInvitationToken)(token);
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.INVITATION_VERIFIED, invitationStatus));
});
/**
 * Accept invitation
 * Validates token, updates user password, verifies email, and marks invitation as used
 */
exports.acceptInvitation = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated body data
    const { token, password } = req.body;
    // Accept invitation
    const user = await (0, userInvitation_queries_1.acceptUserInvitation)({
        token,
        ...(password !== undefined && { password }),
    });
    try {
        // Get the primary tenant (first tenant or primary tenant)
        const primaryTenant = user.tenants?.find((t) => t.userTenants?.isPrimary) ??
            user.tenants?.[0];
        const loginUrl = `${env_1.env.FRONTEND_URL}/login`;
        // Send welcome email via queue
        await (0, mailQueue_service_1.queueWelcomeEmail)({
            to: user.email,
            userName: user.name,
            tenantName: primaryTenant?.name ?? "BKeep",
            loginUrl,
        });
    }
    catch (error) {
        // Log error but don't fail the request
        logger_1.default.error("Failed to queue welcome email:", error);
    }
    // Prepare response data (exclude sensitive fields)
    const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
    };
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.INVITATION_ACCEPTED, {
        user: userData,
    }));
});
/**
 * Revoke invitation
 * Soft deletes an invitation by ID
 * All users can only revoke invitations for their selected tenant
 */
exports.revokeInvitation = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    if (!user?.selectedTenantId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED);
    }
    // Get validated params
    const { invitationId } = req.validatedData;
    // Revoke invitation (filtered by tenant)
    const revokedInvitation = await (0, userInvitation_queries_1.revokeUserInvitation)(invitationId, user.selectedTenantId);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.INVITATION_REVOKED, {
        id: revokedInvitation.id,
        email: revokedInvitation.user?.email,
        tenant: {
            id: revokedInvitation.tenant?.id,
            name: revokedInvitation.tenant?.name,
        },
    }));
});
/**
 * Resend invitation
 * Generates a new token and resends the invitation email
 * All users can only resend invitations for their selected tenant
 */
exports.resendInvitation = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    if (!user?.selectedTenantId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED);
    }
    // Get validated params
    const { invitationId } = req.validatedData;
    // Resend invitation (generates new token, filtered by tenant)
    const { invitation, plainToken } = await (0, userInvitation_queries_1.resendUserInvitation)(invitationId, user.selectedTenantId);
    // Send invitation email via queue
    try {
        // Fetch inviting user's name
        const invitingUser = await (0, user_queries_1.findUserById)(invitation.invitedBy);
        const acceptUrl = `${env_1.env.FRONTEND_URL}/accept-invitation?token=${plainToken}`;
        await (0, mailQueue_service_1.queueUserInvitationEmail)({
            to: invitation.user?.email ?? "",
            acceptUrl,
            tenantName: invitation.tenant?.name ?? "the organization",
            expiryDays: Math.floor(security_1.SECURITY_RULES.USER_INVITATION_TOKEN_EXPIRY_MINUTES / 60 / 24),
            userName: invitation.user?.name ?? "User",
            invitedBy: invitingUser.name,
        });
        logger_1.default.info(`Invitation email queued for ${invitation.user?.email ?? "unknown"}`);
    }
    catch (error) {
        // Log error but don't fail the request
        logger_1.default.error("Failed to queue invitation email:", error);
    }
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.INVITATION_RESENT, {
        id: invitation.id,
        email: invitation.user?.email,
        tenant: {
            id: invitation.tenant?.id,
            name: invitation.tenant?.name,
        },
        createdAt: invitation.createdAt,
    }));
});
