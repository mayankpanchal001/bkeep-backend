"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRolesController = exports.restoreUserById = exports.updateUserActivation = exports.deleteUserById = exports.getUserStatistics = exports.getUserById = exports.getAllUsers = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const audit_1 = require("../constants/audit");
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const user_queries_1 = require("../queries/user.queries");
const shared_schema_1 = require("../schema/shared.schema");
const audit_service_1 = require("../services/audit.service");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all users controller
 * Retrieves users with pagination, sorting, search, and filtering
 * All users are filtered by the authenticated user's selected tenant
 */
exports.getAllUsers = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated query parameters
    const filters = req.validatedData;
    // Filter by selected tenant (tenant context required)
    const tenantId = user.selectedTenantId;
    if (!tenantId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED);
    }
    // Fetch users with filters (exclude the requesting user)
    const { users, total } = await (0, user_queries_1.findUsers)(filters, tenantId, user.role, user.id);
    // Transform users to response format (exclude sensitive fields)
    const usersData = users.map((user) => {
        // Extract roles and permissions
        const roles = user.roles ?? [];
        const allPermissionsMap = new Map();
        // Get primary role (first role)
        const primaryRole = roles[0];
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
        // Extract primary role data
        const roleData = primaryRole
            ? {
                id: primaryRole.id,
                name: primaryRole.name,
                displayName: primaryRole.displayName,
            }
            : { id: "", name: "", displayName: "" };
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            isVerified: user.isVerified,
            verifiedAt: user.verifiedAt ?? null,
            isActive: user.isActive,
            mfaEnabled: user.mfaEnabled,
            lastLoggedInAt: user.lastLoggedInAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: roleData,
            permissions: permissionsData,
        };
    });
    // Get pagination metadata
    const pagination = (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total);
    // Prepare response data
    const responseData = {
        items: usersData,
        pagination,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USERS_RETRIEVED, responseData));
});
/**
 * Get user by ID controller
 * Retrieves a specific user by their ID (SuperAdmin only)
 */
exports.getUserById = (0, asyncHandler_1.default)(async (req, res) => {
    const id = req.params["id"];
    // Fetch user by ID with all relations
    const user = await (0, user_queries_1.findUserById)(id);
    // Extract roles and permissions
    const roles = user.roles ?? [];
    const allPermissionsMap = new Map();
    // Get primary role (first role)
    const primaryRole = roles[0];
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
    // Extract primary role data
    const roleData = primaryRole
        ? {
            id: primaryRole.id,
            name: primaryRole.name,
            displayName: primaryRole.displayName,
        }
        : { id: "", name: "", displayName: "" };
    // Transform user to response format (exclude sensitive fields)
    const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt ?? null,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
        lastLoggedInAt: user.lastLoggedInAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: roleData,
        permissions: permissionsData,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USER_RETRIEVED, userData));
});
/**
 * Get user statistics controller
 * Retrieves user statistics and overview data
 * Statistics are filtered by the user's selected tenant
 */
exports.getUserStatistics = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    if (!user.selectedTenantId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED);
    }
    // Fetch user statistics filtered by selected tenant
    const statistics = await (0, user_queries_1.getUserStatistics)(user.selectedTenantId);
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USER_STATISTICS_RETRIEVED, statistics));
});
/**
 * Delete user controller
 * Soft deletes a user by their ID (SuperAdmin only)
 */
exports.deleteUserById = (0, asyncHandler_1.default)(async (req, res) => {
    const id = req.params["id"];
    const requestContext = (0, audit_service_1.extractRequestContext)(req);
    const tenantId = req.user?.selectedTenantId;
    // Get user before deletion for audit
    const userToDelete = await (0, user_queries_1.findUserById)(id);
    // Delete user (soft delete)
    await (0, user_queries_1.deleteUser)(id);
    // Audit log
    try {
        await (0, audit_service_1.auditDelete)(audit_1.AUDIT_ACTIONS.USER_DELETED, audit_1.AUDIT_ENTITY_TYPES.USER, id, {
            requestContext,
            tenantId: tenantId ?? "",
            metadata: {
                email: userToDelete.email,
                name: userToDelete.name,
            },
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for user deletion:", error);
    }
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USER_DELETED, {}));
});
/**
 * Update user activation status controller
 * Activates or deactivates a user account (SuperAdmin only)
 */
exports.updateUserActivation = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.params["id"];
    const { isActive } = req.body;
    const requestContext = (0, audit_service_1.extractRequestContext)(req);
    const tenantId = req.user?.selectedTenantId;
    // Get user before update for audit
    const userBeforeUpdate = await (0, user_queries_1.findUserById)(userId);
    const updatedUser = await (0, user_queries_1.updateUserActivationStatus)(userId, isActive);
    // Audit log
    try {
        await (0, audit_service_1.auditUpdate)(isActive
            ? audit_1.AUDIT_ACTIONS.USER_ACTIVATED
            : audit_1.AUDIT_ACTIONS.USER_DEACTIVATED, audit_1.AUDIT_ENTITY_TYPES.USER, userId, {
            isActive: { from: userBeforeUpdate.isActive, to: isActive },
        }, {
            requestContext,
            tenantId: tenantId ?? "",
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for user activation:", error);
        // Don't fail the request if audit logging fails
    }
    const message = isActive
        ? success_1.SUCCESS_MESSAGES.USER_ACTIVATED
        : success_1.SUCCESS_MESSAGES.USER_DEACTIVATED;
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, message, {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isActive: updatedUser.isActive,
    }));
});
/**
 * Restore user controller
 * Restores a soft-deleted user by their ID (SuperAdmin only)
 */
exports.restoreUserById = (0, asyncHandler_1.default)(async (req, res) => {
    const id = req.params["id"];
    // Restore user (un-delete)
    const restoredUser = await (0, user_queries_1.restoreUser)(id);
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USER_RESTORED, {
        id: restoredUser.id,
        email: restoredUser.email,
        name: restoredUser.name,
        isActive: restoredUser.isActive,
        deletedAt: restoredUser.deletedAt,
    }));
});
/**
 * Update user roles controller
 * Updates roles assigned to a user (SuperAdmin and Admin only)
 */
exports.updateUserRolesController = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.params["id"];
    // Get body data
    const { roleIds } = req.body;
    // Update user roles
    const updatedUser = await (0, user_queries_1.updateUserRoles)(userId, roleIds);
    // Extract roles and permissions
    const roles = updatedUser.roles ?? [];
    const allPermissionsMap = new Map();
    // Get primary role (first role)
    const primaryRole = roles[0];
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
    // Extract primary role data
    const roleData = primaryRole
        ? {
            id: primaryRole.id,
            name: primaryRole.name,
            displayName: primaryRole.displayName,
        }
        : { id: "", name: "", displayName: "" }; // Fallback (should not happen)
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.USER_ROLES_UPDATED, {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: roleData,
        permissions: permissionsData,
    }));
});
