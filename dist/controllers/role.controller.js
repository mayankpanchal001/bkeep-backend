"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRolePermissionsController = exports.getRoleStatistics = exports.getRoleWithPermissions = exports.getRoleById = exports.getAllRoles = void 0;
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const role_queries_1 = require("../queries/role.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all roles controller
 * Retrieves roles with pagination, sorting, search, and filtering
 */
exports.getAllRoles = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch roles with filters
    const { roles, total } = await (0, role_queries_1.findRoles)(filters);
    // Transform roles to response format
    const rolesData = roles.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isActive: role.isActive,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
    }));
    // Get pagination metadata
    const pagination = (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total);
    // Prepare response data
    const responseData = {
        items: rolesData,
        pagination,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ROLES_RETRIEVED, responseData));
});
/**
 * Get role by ID controller
 * Retrieves a specific role by its ID (excluding superadmin)
 */
exports.getRoleById = (0, asyncHandler_1.default)(async (req, res) => {
    const id = req.params["id"];
    // Fetch role by ID
    const role = await (0, role_queries_1.findRoleById)(id);
    // Transform role to response format
    const roleData = {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isActive: role.isActive,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ROLE_RETRIEVED, roleData));
});
/**
 * Get role with available permissions controller
 * Retrieves a specific role by its ID with its assigned permissions
 */
exports.getRoleWithPermissions = (0, asyncHandler_1.default)(async (req, res) => {
    const id = req.params["id"];
    // Fetch role by ID with permissions
    const role = await (0, role_queries_1.findRoleByIdWithPermissions)(id);
    // Transform permissions to response format
    const permissionsData = role.permissions?.map((permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
        description: permission.description ?? null,
        isActive: permission.isActive,
    })) ?? [];
    // Transform role to response format
    const roleData = {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isActive: role.isActive,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        permissions: permissionsData,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ROLE_WITH_PERMISSIONS_RETRIEVED, roleData));
});
/**
 * Get role statistics controller
 * Retrieves role statistics and overview data
 */
exports.getRoleStatistics = (0, asyncHandler_1.default)(async (_req, res) => {
    // Fetch role statistics
    const statistics = await (0, role_queries_1.getRoleStatistics)();
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ROLE_STATISTICS_RETRIEVED, statistics));
});
/**
 * Update role permissions controller
 * Updates permissions assigned to a role (SuperAdmin only)
 */
exports.updateRolePermissionsController = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated route parameters (params are validated first, then body overwrites validatedData)
    // So we access req.params['id'] directly since it's already validated
    const roleId = req.params["id"];
    // Get body data
    const { permissionIds } = req.body;
    // Update role permissions
    const updatedRole = await (0, role_queries_1.updateRolePermissions)(roleId, permissionIds);
    // Transform permissions to response format
    const permissionsData = updatedRole.permissions?.map((permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
        description: permission.description ?? null,
        isActive: permission.isActive,
    })) ?? [];
    // Transform role to response format
    const roleData = {
        id: updatedRole.id,
        name: updatedRole.name,
        displayName: updatedRole.displayName,
        description: updatedRole.description,
        isActive: updatedRole.isActive,
        createdAt: updatedRole.createdAt,
        updatedAt: updatedRole.updatedAt,
        permissions: permissionsData,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ROLE_PERMISSIONS_UPDATED, roleData));
});
