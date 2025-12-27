"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.switchTenant = exports.restoreTenantById = exports.deleteTenantById = exports.updateTenantController = exports.createTenantController = exports.getTenantById = exports.getUserTenants = exports.getAllTenants = void 0;
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const audit_1 = require("../constants/audit");
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const pagination_1 = require("../constants/pagination");
const success_1 = require("../constants/success");
const User_1 = require("../models/User");
const refreshToken_queries_1 = require("../queries/refreshToken.queries");
const tenant_queries_1 = require("../queries/tenant.queries");
const shared_schema_1 = require("../schema/shared.schema");
const audit_service_1 = require("../services/audit.service");
const tenant_service_1 = require("../services/tenant.service");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const jwt_1 = require("../utils/jwt");
/**
 * Get all tenants controller (for SuperAdmin only)
 * Retrieves all tenants with pagination, sorting, search, and filtering
 * Only SuperAdmin can access this endpoint
 */
exports.getAllTenants = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch all tenants (no user filtering)
    const { tenants, total } = await (0, tenant_queries_1.findTenants)(filters);
    // Transform tenants to list format
    const items = tenants.map((tenant) => {
        const isPrimary = user?.selectedTenantId
            ? tenant.id === user.selectedTenantId
            : false;
        return {
            id: tenant.id,
            name: tenant.name,
            isActive: tenant.isActive,
            isPrimary,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
        };
    });
    // Build response data
    const data = {
        items,
        pagination: (0, shared_schema_1.getPaginationMetadata)(filters.page ?? pagination_1.PAGINATION_DEFAULTS.PAGE_DEFAULT, filters.limit ?? pagination_1.PAGINATION_DEFAULTS.LIMIT_DEFAULT, total),
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANTS_RETRIEVED, data));
});
/**
 * Get user's tenants controller (for regular users)
 * Retrieves tenants that the authenticated user belongs to, with pagination, sorting, search, and filtering
 */
exports.getUserTenants = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch tenants filtered by user membership
    const { tenants, total } = await (0, tenant_queries_1.findTenants)(filters, user.id);
    // Transform tenants to list format
    const items = tenants.map((tenant) => {
        const isPrimary = tenant.id === user.selectedTenantId ||
            tenant.id === user.selectedTenantId;
        return {
            id: tenant.id,
            name: tenant.name,
            isActive: tenant.isActive,
            isPrimary,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
        };
    });
    // Build response data
    const data = {
        items,
        pagination: (0, shared_schema_1.getPaginationMetadata)(filters.page ?? pagination_1.PAGINATION_DEFAULTS.PAGE_DEFAULT, filters.limit ?? pagination_1.PAGINATION_DEFAULTS.LIMIT_DEFAULT, total),
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANTS_RETRIEVED, data));
});
/**
 * Get tenant by ID controller
 * Retrieves a specific tenant by their ID
 * Only SuperAdmin can access this endpoint
 */
exports.getTenantById = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated params
    const { id } = req.params;
    // Fetch tenant
    const tenant = await (0, tenant_queries_1.findTenantById)(id);
    // Prepare tenant response data
    const tenantData = {
        id: tenant.id,
        name: tenant.name,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANT_RETRIEVED, tenantData));
});
/**
 * Create tenant (onboard) controller
 * Creates a new tenant with schema and assigns owner as admin
 * Only SuperAdmin can access this endpoint
 */
exports.createTenantController = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated body data
    const { name, schemaName } = req.body;
    // Onboard tenant (users will be created separately and associated later)
    const { tenant } = await (0, tenant_service_1.onboardTenant)({
        name,
        schemaName,
    });
    // Audit log
    try {
        const requestContext = (0, audit_service_1.extractRequestContext)(req);
        // For tenant creation, use the new tenant's ID as tenantId
        await (0, audit_service_1.auditCreate)(audit_1.AUDIT_ACTIONS.TENANT_CREATED, audit_1.AUDIT_ENTITY_TYPES.TENANT, tenant.id, {
            requestContext,
            tenantId: tenant.id, // New tenant's ID
            metadata: {
                name: tenant.name,
                schemaName: tenant.schemaName,
            },
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for tenant creation:", error);
        // Don't fail the request if audit logging fails
    }
    // Prepare tenant response data
    const tenantData = {
        id: tenant.id,
        name: tenant.name,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.TENANT_ONBOARDED, tenantData));
});
/**
 * Update tenant controller
 * Updates tenant information
 * Only SuperAdmin can access this endpoint
 */
exports.updateTenantController = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated params and body
    const { id } = req.params;
    const updateData = req.body;
    // Get tenant before update for audit
    const tenantBeforeUpdate = await (0, tenant_queries_1.findTenantById)(id);
    // Update tenant
    const updatedTenant = await (0, tenant_queries_1.updateTenant)(id, updateData);
    // Track changes for audit
    const changes = {};
    if (updateData.name && tenantBeforeUpdate.name !== updatedTenant.name) {
        changes["name"] = {
            from: tenantBeforeUpdate.name,
            to: updatedTenant.name,
        };
    }
    if (updateData.isActive !== undefined &&
        tenantBeforeUpdate.isActive !== updatedTenant.isActive) {
        changes["isActive"] = {
            from: tenantBeforeUpdate.isActive,
            to: updatedTenant.isActive,
        };
    }
    // Audit log
    if (Object.keys(changes).length > 0) {
        try {
            const requestContext = (0, audit_service_1.extractRequestContext)(req);
            const tenantId = user.selectedTenantId;
            if (tenantId) {
                await (0, audit_service_1.auditUpdate)(audit_1.AUDIT_ACTIONS.TENANT_UPDATED, audit_1.AUDIT_ENTITY_TYPES.TENANT, id, changes, {
                    requestContext,
                    tenantId,
                });
            }
        }
        catch (error) {
            logger_1.default.error("Failed to create audit log for tenant update:", error);
        }
    }
    // Prepare tenant response data
    const tenantData = {
        id: updatedTenant.id,
        name: updatedTenant.name,
        isActive: updatedTenant.isActive,
        createdAt: updatedTenant.createdAt,
        updatedAt: updatedTenant.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANT_UPDATED, tenantData));
});
/**
 * Delete tenant controller
 * Soft deletes a tenant by their ID
 * Only SuperAdmin can access this endpoint
 */
exports.deleteTenantById = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated params
    const { id } = req.params;
    // Get tenant before deletion for audit
    const tenantToDelete = await (0, tenant_queries_1.findTenantById)(id);
    // Delete tenant
    const deletedTenant = await (0, tenant_queries_1.deleteTenant)(id);
    // Audit log
    try {
        const requestContext = (0, audit_service_1.extractRequestContext)(req);
        const tenantId = user.selectedTenantId;
        if (tenantId) {
            await (0, audit_service_1.auditDelete)(audit_1.AUDIT_ACTIONS.TENANT_DELETED, audit_1.AUDIT_ENTITY_TYPES.TENANT, id, {
                requestContext,
                tenantId,
                metadata: {
                    name: tenantToDelete.name,
                    schemaName: tenantToDelete.schemaName,
                },
            });
        }
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for tenant deletion:", error);
    }
    // Prepare tenant response data
    const tenantData = {
        id: deletedTenant.id,
        name: deletedTenant.name,
        isActive: deletedTenant.isActive,
        createdAt: deletedTenant.createdAt,
        updatedAt: deletedTenant.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANT_DELETED, tenantData));
});
/**
 * Restore tenant controller
 * Restores a soft-deleted tenant
 * Only SuperAdmin can access this endpoint
 */
exports.restoreTenantById = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated params
    const { id } = req.params;
    // Restore tenant
    const restoredTenant = await (0, tenant_queries_1.restoreTenant)(id);
    // Audit log
    try {
        const requestContext = (0, audit_service_1.extractRequestContext)(req);
        const tenantId = user.selectedTenantId;
        if (tenantId) {
            await (0, audit_service_1.auditAction)(audit_1.AUDIT_ACTIONS.TENANT_RESTORED, [{ type: audit_1.AUDIT_ENTITY_TYPES.TENANT, id, name: restoredTenant.name }], {
                requestContext,
                tenantId,
            });
        }
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for tenant restore:", error);
    }
    // Prepare tenant response data
    const tenantData = {
        id: restoredTenant.id,
        name: restoredTenant.name,
        isActive: restoredTenant.isActive,
        createdAt: restoredTenant.createdAt,
        updatedAt: restoredTenant.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANT_RESTORED, tenantData));
});
/**
 * Switch tenant controller
 * Switches user's primary tenant and updates JWT token with new selectedTenantId
 */
exports.switchTenant = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated params
    const { id: tenantId } = req.params;
    // If switching to the same tenant, return early (no need to regenerate tokens)
    if (user.selectedTenantId === tenantId) {
        res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANT_SWITCHED, {
            accessToken: req.headers.authorization?.split(" ")[1] ?? "",
            refreshToken: req.cookies?.["refreshToken"] ?? "",
        }));
        return;
    }
    // Verify tenant exists and get tenant data
    const switchedTenant = await (0, tenant_queries_1.findTenantById)(tenantId);
    // Switch user's primary tenant
    await (0, tenant_queries_1.switchUserTenant)(user.id, tenantId);
    // Get user with all relations (roles, permissions)
    // Fetch roles filtered by the selected tenant
    const userWithRelations = await User_1.User.query()
        .modify("notDeleted")
        .findById(user.id)
        .withGraphFetched("[roles.[permissions]]")
        .modifyGraph("roles", (builder) => {
        builder
            .where("user_roles.tenant_id", tenantId)
            .modify("notDeleted")
            .modify("active");
    })
        .modifyGraph("roles.permissions", (builder) => {
        builder.modify("notDeleted").modify("active");
    });
    if (!userWithRelations) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
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
    // Validate and extract primary role for the selected tenant
    const primaryRole = roles[0];
    if (!primaryRole) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.USER_NO_ROLE);
    }
    // Build JWT user payload
    const payload = {
        id: userWithRelations.id,
        name: userWithRelations.name,
        email: userWithRelations.email,
        role: primaryRole.name,
        permissions: permissionNames,
        selectedTenantId: tenantId,
    };
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = (0, jwt_1.signTokens)(payload);
    // Get current refresh token from request
    const currentRefreshToken = req.cookies?.["refreshToken"] ?? req.headers.authorization?.split(" ")[1];
    // Revoke old refresh token if exists
    if (currentRefreshToken) {
        try {
            await (0, refreshToken_queries_1.revokeRefreshToken)(currentRefreshToken);
        }
        catch (error) {
            // Ignore errors if token doesn't exist
            logger_1.default.warn("Failed to revoke old refresh token:", error);
        }
    }
    // Store new refresh token in database
    await (0, refreshToken_queries_1.createRefreshToken)({
        userId: userWithRelations.id,
        token: newRefreshToken,
        userAgent: req.headers["user-agent"] ?? null,
        ipAddress: req.ip ?? null,
    });
    // Update session with new user data
    const session = req.session;
    if (session) {
        session.user = payload;
    }
    // Set tokens in HTTP-only cookies
    const cookieOptions = {
        httpOnly: true,
        secure: (0, env_1.isProduction)(),
    };
    // Prepare response data
    const responseData = {
        accessToken,
        refreshToken: newRefreshToken,
    };
    // Audit log
    try {
        const requestContext = (0, audit_service_1.extractRequestContext)(req);
        await (0, audit_service_1.auditAction)(audit_1.AUDIT_ACTIONS.TENANT_SWITCHED, [
            {
                type: audit_1.AUDIT_ENTITY_TYPES.TENANT,
                id: tenantId,
                name: switchedTenant.name,
            },
        ], {
            requestContext,
            tenantId: tenantId,
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create audit log for tenant switch:", error);
    }
    res
        .cookie("refreshToken", newRefreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TENANT_SWITCHED, responseData));
});
