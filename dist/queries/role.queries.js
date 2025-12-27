"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRolePermissions = exports.getRoleStatistics = exports.findRoleByIdWithPermissions = exports.findRoleById = exports.findRoles = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const Permission_1 = require("../models/Permission");
const Role_1 = require("../models/Role");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
/**
 * Map sort field to database column
 */
const mapSortField = (field) => {
    const fieldMap = {
        name: "name",
        displayName: "display_name",
        createdAt: "created_at",
        updatedAt: "updated_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "display_name";
};
/**
 * Find roles with pagination, sorting, search, and filtering
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing roles array and total count
 */
const findRoles = async (filters) => {
    const { page, limit, sort = "displayName", order = "asc", search, isActive, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapSortField(sort);
    // Build base query
    let query = Role_1.Role.query()
        .modify("notDeleted")
        .where("name", "!=", "superadmin");
    // Apply active filter if provided
    if (isActive !== undefined) {
        query = query.where("is_active", isActive);
    }
    else {
        // Default to active roles if not specified
        query = query.modify("active");
    }
    // Apply search if provided
    if (search) {
        query = query.modify("search", search);
    }
    // Get total count before pagination
    const total = await query.resultSize();
    // Apply pagination and sorting
    const roles = await query
        .orderBy(sortColumn, order)
        .limit(limit)
        .offset(offset);
    return { roles, total };
};
exports.findRoles = findRoles;
/**
 * Find role by ID
 * @param roleId - Role ID (UUID)
 * @returns Role object
 * @throws ApiError if role not found
 */
const findRoleById = async (roleId) => {
    const role = await Role_1.Role.query().modify("notDeleted").findById(roleId);
    if (!role) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ROLE_NOT_FOUND);
    }
    return role;
};
exports.findRoleById = findRoleById;
/**
 * Find role by ID with permissions (includes superadmin)
 * Returns role with its assigned permissions (only active, non-deleted)
 * @param roleId - Role ID (UUID)
 * @returns Role object with permissions
 * @throws ApiError if role not found
 */
const findRoleByIdWithPermissions = async (roleId) => {
    const role = await Role_1.Role.query()
        .modify("notDeleted")
        .findById(roleId)
        .withGraphFetched("permissions")
        .modifyGraph("permissions", (builder) => {
        builder.modify("notDeleted").modify("active");
    });
    if (!role) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ROLE_NOT_FOUND);
    }
    return role;
};
exports.findRoleByIdWithPermissions = findRoleByIdWithPermissions;
/**
 * Get role statistics and overview data
 * @returns Role statistics including counts, permissions data, and recent roles
 */
const getRoleStatistics = async () => {
    // Base query excluding superadmin and deleted roles
    const baseQuery = Role_1.Role.query()
        .modify("notDeleted")
        .where("name", "!=", "superadmin");
    // Get total count
    const total = await baseQuery.clone().resultSize();
    // Get active roles count
    const active = await baseQuery.clone().modify("active").resultSize();
    // Get inactive roles count
    const inactive = await baseQuery.clone().modify("inactive").resultSize();
    // Get roles with permissions count
    // Using joinRelated to count roles that have at least one permission
    const rolesWithPermissionsResult = await Role_1.Role.query()
        .where("roles.deleted_at", null)
        .where("roles.name", "!=", "superadmin")
        .joinRelated("permissions")
        .where("permissions.deleted_at", null)
        .where("permissions.is_active", true)
        .countDistinct("roles.id as count")
        .first();
    const rolesWithPermissions = Number.parseInt(String(rolesWithPermissionsResult
        ?.count ?? "0"), 10);
    // Get roles without permissions count
    const withoutPermissions = total - rolesWithPermissions;
    // Get total permissions count across all roles
    // Count unique permissions assigned to roles (excluding superadmin)
    const totalPermissionsResult = await Role_1.Role.query()
        .where("roles.deleted_at", null)
        .where("roles.name", "!=", "superadmin")
        .joinRelated("permissions")
        .where("permissions.deleted_at", null)
        .where("permissions.is_active", true)
        .countDistinct("permissions.id as count")
        .first();
    const totalPermissions = Number.parseInt(String(totalPermissionsResult
        ?.count ?? "0"), 10);
    // Calculate average permissions per role
    const averagePermissionsPerRole = rolesWithPermissions > 0
        ? Number.parseFloat((totalPermissions / rolesWithPermissions).toFixed(2))
        : 0;
    // Get recent roles (last 5 created, excluding superadmin)
    const recentRolesData = await Role_1.Role.query()
        .modify("notDeleted")
        .where("name", "!=", "superadmin")
        .orderBy("created_at", "desc")
        .limit(5)
        .select("id", "name", "display_name as displayName", "created_at as createdAt");
    const recentRoles = recentRolesData.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        createdAt: role.createdAt,
    }));
    return {
        total,
        active,
        inactive,
        withPermissions: rolesWithPermissions,
        withoutPermissions,
        totalPermissions,
        averagePermissionsPerRole,
        recentRoles,
    };
};
exports.getRoleStatistics = getRoleStatistics;
/**
 * Update role permissions
 * Replaces all permissions for a role with the provided permission IDs
 * @param roleId - Role ID (UUID)
 * @param permissionIds - Array of permission IDs to assign to the role
 * @returns Updated role with permissions
 * @throws ApiError if role not found or permission IDs are invalid
 */
const updateRolePermissions = async (roleId, permissionIds) => {
    // Find role
    const role = await Role_1.Role.query().modify("notDeleted").findById(roleId);
    if (!role) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ROLE_NOT_FOUND);
    }
    // Validate all permission IDs exist and are active
    if (permissionIds.length > 0) {
        const permissions = await Permission_1.Permission.query()
            .modify("notDeleted")
            .modify("active")
            .whereIn("id", permissionIds);
        if (permissions.length !== permissionIds.length) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, "One or more permission IDs are invalid, inactive, or deleted");
        }
    }
    // Sync permissions (replace all existing permissions with new ones)
    await role.syncPermissions(permissionIds);
    // Return updated role with permissions
    return (0, exports.findRoleByIdWithPermissions)(roleId);
};
exports.updateRolePermissions = updateRolePermissions;
