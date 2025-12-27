"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTenantRolePermissions = exports.userHasAllPermissions = exports.userHasAnyPermission = exports.userHasPermission = exports.getUserPermissionsInTenant = exports.userHasAllRoles = exports.userHasAnyRole = exports.syncUserRolesInTenant = exports.removeAllUserRolesInTenant = exports.removeRoleFromUser = exports.assignRoleToUser = exports.checkUserHasRole = exports.findUsersWithRoleInTenant = exports.findAllUserRoles = exports.findUserRolesInTenant = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const roles_1 = require("../constants/roles");
const Role_1 = require("../models/Role");
const Tenant_1 = require("../models/Tenant");
const User_1 = require("../models/User");
const UserRole_1 = require("../models/UserRole");
const UserTenant_1 = require("../models/UserTenant");
const ApiError_1 = require("../utils/ApiError");
/**
 * Find all roles for a user in a specific tenant
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @returns Array of UserRole with role details
 */
const findUserRolesInTenant = async (userId, tenantId) => {
    // Verify user exists and is active
    const user = await User_1.User.query()
        .modify("notDeleted")
        .modify("active")
        .findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Verify tenant exists and is active
    const tenant = await Tenant_1.Tenant.query()
        .modify("notDeleted")
        .modify("active")
        .findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    // Get user roles in tenant with role details
    const userRoles = (await UserRole_1.UserRole.findByUserAndTenant(userId, tenantId));
    return userRoles;
};
exports.findUserRolesInTenant = findUserRolesInTenant;
/**
 * Find all roles for a user across all tenants
 * @param userId - User ID
 * @returns Object with roles grouped by tenant
 */
const findAllUserRoles = async (userId) => {
    // Verify user exists
    const user = await User_1.User.query()
        .modify("notDeleted")
        .modify("active")
        .findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Get all user roles with role and tenant details
    const userRoles = (await UserRole_1.UserRole.findByUser(userId));
    // Group roles by tenant
    const rolesByTenant = {};
    for (const userRole of userRoles) {
        // Skip if relations not loaded
        if (!userRole.tenant || !userRole.role)
            continue;
        rolesByTenant[userRole.tenantId] ??= {
            tenantId: userRole.tenant.id,
            tenantName: userRole.tenant.name,
            schemaName: userRole.tenant.schemaName,
            roles: [],
        };
        rolesByTenant[userRole.tenantId]?.roles.push({
            roleId: userRole.role.id,
            roleName: userRole.role.name,
            roleDisplayName: userRole.role.displayName,
            assignedAt: userRole.createdAt,
        });
    }
    return rolesByTenant;
};
exports.findAllUserRoles = findAllUserRoles;
/**
 * Find all users with a specific role in a tenant
 * @param roleId - Role ID
 * @param tenantId - Tenant ID
 * @returns Array of UserRole with user details
 */
const findUsersWithRoleInTenant = async (roleId, tenantId) => {
    // Verify role exists
    const role = await Role_1.Role.query()
        .modify("notDeleted")
        .modify("active")
        .findById(roleId);
    if (!role) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ROLE_NOT_FOUND);
    }
    // Verify tenant exists
    const tenant = await Tenant_1.Tenant.query()
        .modify("notDeleted")
        .modify("active")
        .findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    // Get users with this role in tenant
    const userRoles = (await UserRole_1.UserRole.findByRoleAndTenant(roleId, tenantId));
    return userRoles;
};
exports.findUsersWithRoleInTenant = findUsersWithRoleInTenant;
/**
 * Check if a user has a specific role in a tenant
 * @param userId - User ID
 * @param roleId - Role ID
 * @param tenantId - Tenant ID
 * @returns boolean
 */
const checkUserHasRole = async (userId, roleId, tenantId) => {
    return UserRole_1.UserRole.hasRole(userId, roleId, tenantId);
};
exports.checkUserHasRole = checkUserHasRole;
/**
 * Assign a role to a user in a tenant
 * @param input - Assignment input (userId, roleId, tenantId)
 * @returns Created UserRole
 */
const assignRoleToUser = async (input) => {
    const { userId, roleId, tenantId } = input;
    // Verify user exists and is active
    const user = await User_1.User.query()
        .modify("notDeleted")
        .modify("active")
        .findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Verify role exists and is active
    const role = await Role_1.Role.query()
        .modify("notDeleted")
        .modify("active")
        .findById(roleId);
    if (!role) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ROLE_NOT_FOUND);
    }
    // Check if role is superadmin (cannot be assigned via this method)
    if (role.name === roles_1.ROLES.SUPERADMIN) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.CANNOT_ASSIGN_SUPERADMIN_ROLE);
    }
    // Verify tenant exists and is active
    const tenant = await Tenant_1.Tenant.query()
        .modify("notDeleted")
        .modify("active")
        .findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    // Verify user is a member of the tenant using helper method
    const isMember = await UserTenant_1.UserTenant.isMember(userId, tenantId);
    if (!isMember) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.USER_NOT_MEMBER_OF_TENANT);
    }
    // Assign role
    return UserRole_1.UserRole.assignRole(userId, roleId, tenantId);
};
exports.assignRoleToUser = assignRoleToUser;
/**
 * Remove a role from a user in a tenant
 * @param input - Removal input (userId, roleId, tenantId)
 * @returns Number of deleted rows
 */
const removeRoleFromUser = async (input) => {
    const { userId, roleId, tenantId } = input;
    // Verify user exists
    const user = await User_1.User.query()
        .modify("notDeleted")
        .modify("active")
        .findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Verify role exists
    const role = await Role_1.Role.query()
        .modify("notDeleted")
        .modify("active")
        .findById(roleId);
    if (!role) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ROLE_NOT_FOUND);
    }
    // Verify tenant exists
    const tenant = await Tenant_1.Tenant.query()
        .modify("notDeleted")
        .modify("active")
        .findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    // Check if role assignment exists
    const hasRole = await UserRole_1.UserRole.hasRole(userId, roleId, tenantId);
    if (!hasRole) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, "User does not have this role in the specified tenant");
    }
    // Remove role
    await UserRole_1.UserRole.removeRole(userId, roleId, tenantId);
};
exports.removeRoleFromUser = removeRoleFromUser;
/**
 * Remove all roles from a user in a tenant
 * @param userId - User ID
 * @param tenantId - Tenant ID
 */
const removeAllUserRolesInTenant = async (userId, tenantId) => {
    // Verify user exists
    const user = await User_1.User.query()
        .modify("notDeleted")
        .modify("active")
        .findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Verify tenant exists
    const tenant = await Tenant_1.Tenant.query()
        .modify("notDeleted")
        .modify("active")
        .findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    // Remove all roles
    await UserRole_1.UserRole.removeAllUserRolesInTenant(userId, tenantId);
};
exports.removeAllUserRolesInTenant = removeAllUserRolesInTenant;
/**
 * Sync user roles in a tenant (replace all roles with the given ones)
 * @param input - Sync input (userId, tenantId, roleIds)
 */
const syncUserRolesInTenant = async (input) => {
    const { userId, tenantId, roleIds } = input;
    // Verify user exists and is active
    const user = await User_1.User.query()
        .modify("notDeleted")
        .modify("active")
        .findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Verify tenant exists and is active
    const tenant = await Tenant_1.Tenant.query()
        .modify("notDeleted")
        .modify("active")
        .findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    // Verify user is a member of the tenant using helper method
    const isMember = await UserTenant_1.UserTenant.isMember(userId, tenantId);
    if (!isMember) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.USER_NOT_MEMBER_OF_TENANT);
    }
    // Validate all role IDs exist and are active
    if (roleIds.length > 0) {
        const roles = await Role_1.Role.query()
            .modify("notDeleted")
            .modify("active")
            .whereIn("id", roleIds);
        if (roles.length !== roleIds.length) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.INVALID_ROLE_IDS);
        }
        // Check if any role is superadmin
        const hasSuperAdminRole = roles.some((role) => role.name === roles_1.ROLES.SUPERADMIN);
        if (hasSuperAdminRole) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.CANNOT_ASSIGN_SUPERADMIN_ROLE);
        }
    }
    // Sync roles
    await UserRole_1.UserRole.syncUserRolesInTenant(userId, tenantId, roleIds);
    // Return updated user roles
    return (0, exports.findUserRolesInTenant)(userId, tenantId);
};
exports.syncUserRolesInTenant = syncUserRolesInTenant;
/**
 * Check if user has any of the specified roles in a tenant
 * @param userId - User ID
 * @param roleNames - Array of role names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
const userHasAnyRole = async (userId, roleNames, tenantId) => {
    const userRoles = await (0, exports.findUserRolesInTenant)(userId, tenantId);
    return userRoles.some((ur) => roleNames.includes(ur.role.name));
};
exports.userHasAnyRole = userHasAnyRole;
/**
 * Check if user has all specified roles in a tenant
 * @param userId - User ID
 * @param roleNames - Array of role names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
const userHasAllRoles = async (userId, roleNames, tenantId) => {
    const userRoles = await (0, exports.findUserRolesInTenant)(userId, tenantId);
    const userRoleNames = userRoles.map((ur) => ur.role.name);
    return roleNames.every((roleName) => userRoleNames.includes(roleName));
};
exports.userHasAllRoles = userHasAllRoles;
/**
 * Get user's permissions in a tenant (via roles)
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @returns Array of unique permission names
 */
const getUserPermissionsInTenant = async (userId, tenantId) => {
    // Get user roles with permissions
    const userRoles = await UserRole_1.UserRole.query()
        .where("user_id", userId)
        .where("tenant_id", tenantId)
        .withGraphFetched("role.permissions");
    // Extract unique permission names
    const permissionSet = new Set();
    for (const userRole of userRoles) {
        if (userRole.role?.permissions) {
            for (const permission of userRole.role.permissions) {
                if (permission.isActive) {
                    permissionSet.add(permission.name);
                }
            }
        }
    }
    return Array.from(permissionSet);
};
exports.getUserPermissionsInTenant = getUserPermissionsInTenant;
/**
 * Check if user has a specific permission in a tenant
 * @param userId - User ID
 * @param permissionName - Permission name to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
const userHasPermission = async (userId, permissionName, tenantId) => {
    const permissions = await (0, exports.getUserPermissionsInTenant)(userId, tenantId);
    return permissions.includes(permissionName);
};
exports.userHasPermission = userHasPermission;
/**
 * Check if user has any of the specified permissions in a tenant
 * @param userId - User ID
 * @param permissionNames - Array of permission names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
const userHasAnyPermission = async (userId, permissionNames, tenantId) => {
    const permissions = await (0, exports.getUserPermissionsInTenant)(userId, tenantId);
    return permissionNames.some((perm) => permissions.includes(perm));
};
exports.userHasAnyPermission = userHasAnyPermission;
/**
 * Check if user has all specified permissions in a tenant
 * @param userId - User ID
 * @param permissionNames - Array of permission names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
const userHasAllPermissions = async (userId, permissionNames, tenantId) => {
    const permissions = await (0, exports.getUserPermissionsInTenant)(userId, tenantId);
    return permissionNames.every((perm) => permissions.includes(perm));
};
exports.userHasAllPermissions = userHasAllPermissions;
/**
 * Get complete user-tenant-role-permissions relationship
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @returns Complete relationship data with roles and permissions
 */
const getUserTenantRolePermissions = async (userId, tenantId) => {
    // Verify user exists
    const user = await User_1.User.query()
        .modify("notDeleted")
        .modify("active")
        .findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Verify tenant exists
    const tenant = await Tenant_1.Tenant.query()
        .modify("notDeleted")
        .modify("active")
        .findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    // Check if user is member of tenant
    const isMember = await UserTenant_1.UserTenant.isMember(userId, tenantId);
    if (!isMember) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.USER_NOT_MEMBER_OF_TENANT);
    }
    // Get user roles in tenant with permissions
    const userRoles = await UserRole_1.UserRole.query()
        .where("user_id", userId)
        .where("tenant_id", tenantId)
        .withGraphFetched("role.permissions")
        .modifyGraph("role", (builder) => {
        builder.modify("notDeleted").modify("active");
    })
        .modifyGraph("role.permissions", (builder) => {
        builder.modify("notDeleted").modify("active");
    });
    // Extract and organize data
    const roles = userRoles
        .filter((ur) => ur.role)
        .map((ur) => {
        // Type guard ensures role exists after filter
        if (!ur.role)
            return null;
        const role = ur.role;
        return {
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            assignedAt: ur.createdAt,
            permissions: (role.permissions ?? []).map((p) => ({
                id: p.id,
                name: p.name,
                displayName: p.displayName,
                description: null, // Description not included in graph fetch
            })),
        };
    })
        .filter((role) => role !== null);
    // Get unique permissions across all roles
    const allPermissionsMap = new Map();
    for (const role of roles) {
        for (const permission of role.permissions) {
            if (!allPermissionsMap.has(permission.name)) {
                allPermissionsMap.set(permission.name, permission);
            }
        }
    }
    return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        tenantId: tenant.id,
        tenantName: tenant.name,
        roles,
        permissions: Array.from(allPermissionsMap.values()),
        permissionNames: Array.from(allPermissionsMap.keys()),
    };
};
exports.getUserTenantRolePermissions = getUserTenantRolePermissions;
