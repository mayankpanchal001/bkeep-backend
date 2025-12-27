"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoles = exports.restoreUser = exports.updateAuthenticatorLastUsed = exports.getUnverifiedTotpAuthenticator = exports.getUserTotpAuthenticator = exports.updateUserBackupCodes = exports.disableUserTotp = exports.verifyAndEnableUserTotp = exports.setupUserTotp = exports.updateUserMfaStatus = exports.updateUserActivationStatus = exports.deleteUser = exports.getUserStatistics = exports.findUsers = exports.updateUserProfile = exports.updateUserPassword = exports.findUserByIdComplete = exports.findUserById = exports.findUserByEmailAndPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const roles_1 = require("../constants/roles");
const Role_1 = require("../models/Role");
const User_1 = require("../models/User");
const UserAuthenticator_1 = require("../models/UserAuthenticator");
const UserRole_1 = require("../models/UserRole");
const UserTenant_1 = require("../models/UserTenant");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
/**
 * Find user by email and verify password
 * @param credentials - Login credentials (email and password)
 * @returns User object if credentials are valid
 * @throws ApiError if user not found or password is invalid
 */
const findUserByEmailAndPassword = async (credentials) => {
    const { email, password } = credentials;
    // Find user by email (only non-deleted, verified users)
    const user = await User_1.User.findByEmail(email);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD);
    }
    // Check if user is verified
    if (!user.isVerified) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, "Email not verified. Please verify your email first.");
    }
    // Check if user account is active
    if (!user.isActive) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.ACCOUNT_DEACTIVATED);
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, errors_1.ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD);
    }
    // Update last logged in timestamp
    await user.$query().patch({
        lastLoggedInAt: (0, date_1.getCurrentISOString)(),
    });
    return user;
};
exports.findUserByEmailAndPassword = findUserByEmailAndPassword;
/**
 * Find user by ID with relations
 * @param userId - User ID
 * @returns User object with relations (roles with permissions, and tenants)
 * @throws ApiError if user not found
 */
const findUserById = async (userId) => {
    const user = await User_1.User.query()
        .modify("notDeleted")
        .findById(userId)
        .withGraphFetched("roles.[permissions]")
        .modifyGraph("roles.permissions", (builder) => {
        builder.modify("notDeleted").modify("active");
    })
        .withGraphFetched("tenants");
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
};
exports.findUserById = findUserById;
/**
 * Find user by ID with all relations (roles, permissions, and tenants)
 * @param userId - User ID
 * @returns User object with roles, permissions, and tenants
 * @throws ApiError if user not found
 */
const findUserByIdComplete = async (userId) => {
    const user = await User_1.User.query()
        .modify("notDeleted")
        .findById(userId)
        .withGraphFetched("[roles.[permissions], tenants]");
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Manually fetch pivot table data using UserTenant model
    if (user.tenants && user.tenants.length > 0) {
        const userTenants = await UserTenant_1.UserTenant.findByUser(userId);
        // Merge pivot data into tenants
        user.tenants = user.tenants.map((tenant) => {
            const pivot = userTenants.find((ut) => ut.tenantId === tenant.id);
            if (!pivot) {
                return tenant;
            }
            return {
                ...tenant,
                userTenants: {
                    isPrimary: pivot.isPrimary,
                    createdAt: pivot.createdAt,
                },
            };
        });
    }
    return user;
};
exports.findUserByIdComplete = findUserByIdComplete;
/**
 * Update user password
 * @param userId - User ID
 * @param passwordHash - Hashed password
 * @returns Updated User object
 * @throws ApiError if user not found
 */
const updateUserPassword = async (userId, passwordHash) => {
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    await user.$query().patch({
        passwordHash,
    });
    return user;
};
exports.updateUserPassword = updateUserPassword;
/**
 * Update user profile
 * @param userId - User ID
 * @param data - Profile data to update (name only)
 * @returns Updated User object
 * @throws ApiError if user not found
 */
const updateUserProfile = async (userId, data) => {
    const { name } = data;
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Update only name
    await user.$query().patch({ name });
    return user;
};
exports.updateUserProfile = updateUserProfile;
/**
 * Map sort field to database column
 */
const mapUserSortField = (field) => {
    const fieldMap = {
        name: "name",
        email: "email",
        createdAt: "created_at",
        updatedAt: "updated_at",
        lastLoggedInAt: "last_logged_in_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "created_at";
};
/**
 * Find users with pagination, sorting, search, and filtering
 * @param filters - Filter, pagination, and sorting parameters
 * @param tenantId - Optional tenant ID to filter users by tenant (for Admin users)
 * @param requestingUserRole - Optional role of the requesting user (to filter superadmin users)
 * @returns Object containing users array and total count
 */
const findUsers = async (filters, tenantId, requestingUserRole, requestingUserId) => {
    const { page, limit, sort = "createdAt", order = "asc", search, isVerified, isActive, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapUserSortField(sort);
    // Build base query
    let query = User_1.User.query().modify("notDeleted");
    // Filter out the requesting user from results
    if (requestingUserId) {
        query = query.whereNot("users.id", requestingUserId);
    }
    // Apply tenant filter if provided (for Admin users)
    if (tenantId) {
        query = query
            .join("user_tenants", "users.id", "user_tenants.user_id")
            .where("user_tenants.tenant_id", tenantId)
            .groupBy("users.id");
    }
    // Exclude superadmin users if requesting user is not a superadmin
    if (requestingUserRole !== roles_1.ROLES.SUPERADMIN) {
        query = query.whereNotExists((builder) => {
            builder
                .select(1)
                .from("user_roles")
                .join("roles", "user_roles.role_id", "roles.id")
                .whereRaw("user_roles.user_id = users.id")
                .where("roles.name", roles_1.ROLES.SUPERADMIN)
                .whereNull("roles.deleted_at");
        });
    }
    // Apply verified filter if provided
    if (isVerified !== undefined) {
        if (isVerified) {
            query = query.modify("verified");
        }
        else {
            query = query.modify("unverified");
        }
    }
    // Apply active filter if provided
    if (isActive !== undefined) {
        if (isActive) {
            query = query.modify("active");
        }
        else {
            query = query.modify("inactive");
        }
    }
    // Apply search if provided
    if (search) {
        query = query.modify("search", search);
    }
    // Get total count before pagination
    const total = await query.resultSize();
    // Apply pagination and sorting, then fetch relations
    const users = await query
        .orderBy(sortColumn, order)
        .limit(limit)
        .offset(offset)
        .withGraphFetched("roles.[permissions]")
        .modifyGraph("roles.permissions", (builder) => {
        builder.modify("notDeleted").modify("active");
    })
        .withGraphFetched("tenants");
    if (users.length > 0) {
        const userIds = users.map((user) => user.id);
        // Fetch all user-tenant relationships for these users using UserTenant model
        const userTenants = await UserTenant_1.UserTenant.query().whereIn("user_id", userIds);
        const pivotMap = new Map(userTenants.map((ut) => [
            `${ut.userId}-${ut.tenantId}`,
            {
                isPrimary: ut.isPrimary,
                createdAt: ut.createdAt,
            },
        ]));
        // Merge pivot data into tenants for each user
        users.forEach((user) => {
            if (user.tenants && user.tenants.length > 0) {
                user.tenants = user.tenants.map((tenant) => {
                    const pivot = pivotMap.get(`${user.id}-${tenant.id}`);
                    return pivot ? { ...tenant, userTenants: pivot } : tenant;
                });
            }
        });
    }
    return { users, total };
};
exports.findUsers = findUsers;
/**
 * Get user statistics and overview data
 * @param tenantId - Optional tenant ID to filter users by tenant
 * @returns User statistics including counts and recent users
 */
const getUserStatistics = async (tenantId) => {
    // Base query for non-deleted users
    let baseQuery = User_1.User.query().modify("notDeleted");
    // Filter out superadmin users
    baseQuery = baseQuery.whereNotExists((builder) => {
        builder
            .select(1)
            .from("user_roles")
            .join("roles", "user_roles.role_id", "roles.id")
            .whereRaw("user_roles.user_id = users.id")
            .where("roles.name", roles_1.ROLES.SUPERADMIN)
            .whereNull("roles.deleted_at");
    });
    // Filter by tenant if tenantId is provided
    if (tenantId) {
        baseQuery = baseQuery
            .join("user_tenants", "users.id", "user_tenants.user_id")
            .where("user_tenants.tenant_id", tenantId)
            .groupBy("users.id");
    }
    // Get total count
    const total = await baseQuery.clone().resultSize();
    // Get verified users count
    const verified = await baseQuery.clone().modify("verified").resultSize();
    // Get unverified users count
    const unverified = await baseQuery.clone().modify("unverified").resultSize();
    // Get users with roles count
    // Using joinRelated to count users that have at least one role
    let usersWithRolesQuery = User_1.User.query()
        .where("users.deleted_at", null)
        .join("user_roles", "users.id", "user_roles.user_id")
        .join("roles", "user_roles.role_id", "roles.id")
        .where("roles.deleted_at", null)
        .whereNotExists((builder) => {
        builder
            .select(1)
            .from("user_roles as ur2")
            .join("roles as r2", "ur2.role_id", "r2.id")
            .whereRaw("ur2.user_id = users.id")
            .where("r2.name", roles_1.ROLES.SUPERADMIN)
            .whereNull("r2.deleted_at");
    });
    // Filter by tenant if tenantId is provided
    if (tenantId) {
        usersWithRolesQuery = usersWithRolesQuery
            .join("user_tenants", "users.id", "user_tenants.user_id")
            .where("user_tenants.tenant_id", tenantId)
            .where("user_roles.tenant_id", tenantId);
    }
    const usersWithRolesResult = await usersWithRolesQuery
        .countDistinct("users.id as count")
        .first();
    const usersWithRoles = Number.parseInt(String(usersWithRolesResult?.count ??
        "0"), 10);
    // Get users without roles count
    const withoutRoles = total - usersWithRoles;
    // Get recent users (last 5 created)
    let recentUsersQuery = User_1.User.query()
        .modify("notDeleted")
        .whereNotExists((builder) => {
        builder
            .select(1)
            .from("user_roles")
            .join("roles", "user_roles.role_id", "roles.id")
            .whereRaw("user_roles.user_id = users.id")
            .where("roles.name", roles_1.ROLES.SUPERADMIN)
            .whereNull("roles.deleted_at");
    })
        .orderBy("users.created_at", "desc")
        .limit(5);
    // Filter by tenant if tenantId is provided
    if (tenantId) {
        recentUsersQuery = recentUsersQuery
            .join("user_tenants", "users.id", "user_tenants.user_id")
            .where("user_tenants.tenant_id", tenantId)
            .groupBy("users.id", "users.email", "users.name", "users.is_verified", "users.created_at");
    }
    const recentUsersData = await recentUsersQuery.select("users.id", "users.email", "users.name", "users.is_verified as isVerified", "users.created_at as createdAt");
    const recentUsers = recentUsersData.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
    }));
    return {
        total,
        verified,
        unverified,
        withRoles: usersWithRoles,
        withoutRoles,
        recentUsers,
    };
};
exports.getUserStatistics = getUserStatistics;
/**
 * Delete user (soft delete)
 * Marks a user as deleted by setting deleted_at timestamp
 * @param userId - User ID
 * @returns Deleted User object
 * @throws ApiError if user not found, already deleted, or is superadmin
 */
const deleteUser = async (userId) => {
    const user = await User_1.User.query()
        .modify("notDeleted")
        .findById(userId)
        .withGraphFetched("roles");
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Check if user has superadmin role
    const hasSuperAdminRole = user.roles?.some((role) => role.name === roles_1.ROLES.SUPERADMIN);
    if (hasSuperAdminRole) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.CANNOT_DELETE_SUPERADMIN);
    }
    // Soft delete the user
    await user.softDelete();
    return user;
};
exports.deleteUser = deleteUser;
/**
 * Update user activation status
 * @param userId - User ID
 * @param isActive - Activation status (true = active, false = inactive)
 * @returns Updated User object
 * @throws ApiError if user not found or is superadmin trying to deactivate
 */
const updateUserActivationStatus = async (userId, isActive) => {
    const user = await User_1.User.query()
        .modify("notDeleted")
        .findById(userId)
        .withGraphFetched("roles");
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Check if trying to deactivate a superadmin user
    if (!isActive) {
        const hasSuperAdminRole = user.roles?.some((role) => role.name === roles_1.ROLES.SUPERADMIN);
        if (hasSuperAdminRole) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.CANNOT_DEACTIVATE_SUPERADMIN);
        }
    }
    await user.$query().patch({ isActive });
    return user;
};
exports.updateUserActivationStatus = updateUserActivationStatus;
/**
 * Update user MFA status
 * @param userId - User ID
 * @param mfaEnabled - MFA enabled status
 * @returns Updated User object
 * @throws ApiError if user not found
 */
const updateUserMfaStatus = async (userId, mfaEnabled) => {
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    await user.$query().patch({ mfaEnabled });
    return user;
};
exports.updateUserMfaStatus = updateUserMfaStatus;
/**
 * Setup TOTP for user (create authenticator)
 * @param userId - User ID
 * @param secret - TOTP secret
 * @param backupCodes - JSON encoded backup codes
 * @param userAgent - User agent string
 * @param ipAddress - IP address
 * @returns Created UserAuthenticator object
 * @throws ApiError if user not found
 */
const setupUserTotp = async (userId, secret, backupCodes, userAgent, ipAddress) => {
    // Verify user exists
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Deactivate any existing authenticators for this user
    await UserAuthenticator_1.UserAuthenticator.query()
        .modify("notDeleted")
        .where("user_id", userId)
        .patch({
        isActive: false,
    });
    // Create new authenticator (unverified)
    const authenticator = await UserAuthenticator_1.UserAuthenticator.query().insert({
        userId,
        type: "totp",
        secret,
        backupCodes,
        isActive: false, // Not active until verified
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
    });
    return authenticator;
};
exports.setupUserTotp = setupUserTotp;
/**
 * Verify and enable TOTP for user
 * @param userId - User ID
 * @param authenticatorId - Optional authenticator ID (if not provided, uses the latest unverified one)
 * @returns Verified UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
const verifyAndEnableUserTotp = async (userId, authenticatorId) => {
    // Verify user exists
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Find the authenticator
    let authenticator;
    if (authenticatorId) {
        authenticator = await UserAuthenticator_1.UserAuthenticator.query()
            .modify("notDeleted")
            .modify("byUser", userId)
            .findById(authenticatorId);
    }
    else {
        // Find the most recent unverified authenticator
        authenticator = await UserAuthenticator_1.UserAuthenticator.query()
            .modify("notDeleted")
            .modify("byUser", userId)
            .modify("unverified")
            .orderBy("created_at", "desc")
            .first();
    }
    if (!authenticator) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_SETUP_REQUIRED);
    }
    // Activate and verify the authenticator
    await authenticator.$query().patch({
        isActive: true,
        verifiedAt: (0, date_1.getCurrentISOString)(),
    });
    // Enable MFA on user account
    await user.$query().patch({
        mfaEnabled: true,
    });
    return authenticator;
};
exports.verifyAndEnableUserTotp = verifyAndEnableUserTotp;
/**
 * Disable TOTP for user
 * @param userId - User ID
 * @returns Updated User object
 * @throws ApiError if user not found
 */
const disableUserTotp = async (userId) => {
    // Verify user exists
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Soft delete all authenticators for this user
    await UserAuthenticator_1.UserAuthenticator.query()
        .modify("notDeleted")
        .where("user_id", userId)
        .patch({
        deletedAt: (0, date_1.getCurrentISOString)(),
    });
    // Disable MFA on user account
    await user.$query().patch({
        mfaEnabled: false,
    });
    return user;
};
exports.disableUserTotp = disableUserTotp;
/**
 * Update user backup codes
 * @param userId - User ID
 * @param backupCodes - JSON encoded backup codes
 * @returns Updated UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
const updateUserBackupCodes = async (userId, backupCodes) => {
    // Verify user exists
    const user = await User_1.User.query().modify("notDeleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Find active authenticator
    const authenticator = await UserAuthenticator_1.UserAuthenticator.findActiveByUserAndType(userId, "totp");
    if (!authenticator) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED);
    }
    // Update backup codes
    await authenticator.$query().patch({
        backupCodes,
    });
    return authenticator;
};
exports.updateUserBackupCodes = updateUserBackupCodes;
/**
 * Get active TOTP authenticator for user
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
const getUserTotpAuthenticator = async (userId) => {
    return UserAuthenticator_1.UserAuthenticator.findActiveByUserAndType(userId, "totp");
};
exports.getUserTotpAuthenticator = getUserTotpAuthenticator;
/**
 * Get unverified TOTP authenticator for user
 * Used during TOTP verification process
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
const getUnverifiedTotpAuthenticator = async (userId) => {
    return UserAuthenticator_1.UserAuthenticator.query()
        .modify("notDeleted")
        .modify("byUser", userId)
        .modify("byType", "totp")
        .modify("unverified")
        .orderBy("created_at", "desc")
        .first();
};
exports.getUnverifiedTotpAuthenticator = getUnverifiedTotpAuthenticator;
/**
 * Update authenticator last used timestamp
 * @param authenticatorId - Authenticator ID
 */
const updateAuthenticatorLastUsed = async (authenticatorId) => {
    await UserAuthenticator_1.UserAuthenticator.query()
        .findById(authenticatorId)
        .patch({
        lastUsedAt: (0, date_1.getCurrentISOString)(),
    });
};
exports.updateAuthenticatorLastUsed = updateAuthenticatorLastUsed;
/**
 * Restore user (un-delete)
 * Restores a soft-deleted user by clearing the deleted_at timestamp
 * @param userId - User ID
 * @returns Restored User object
 * @throws ApiError if user not found or not deleted
 */
const restoreUser = async (userId) => {
    const user = await User_1.User.query().modify("deleted").findById(userId);
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    await user.restore();
    return user;
};
exports.restoreUser = restoreUser;
/**
 * Update user roles
 * Replaces all roles for a user with the provided role IDs
 * @param userId - User ID
 * @param roleIds - Array of role IDs to assign to the user
 * @returns Updated User object with roles
 * @throws ApiError if user not found, role IDs are invalid, or superadmin role is included
 */
const updateUserRoles = async (userId, roleIds) => {
    // Find user with tenants to get primary tenant
    const user = await User_1.User.query()
        .modify("notDeleted")
        .findById(userId)
        .withGraphFetched("tenants");
    if (!user) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // Get primary tenant
    const tenants = user.tenants ?? [];
    const primaryTenant = tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0];
    if (!primaryTenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.USER_NO_TENANT);
    }
    // Validate all role IDs exist, are active, and not deleted
    if (roleIds.length > 0) {
        const roles = await Role_1.Role.query()
            .modify("notDeleted")
            .modify("active")
            .whereIn("id", roleIds);
        if (roles.length !== roleIds.length) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, "One or more role IDs are invalid, inactive, or deleted");
        }
        // Check if any role is superadmin
        const hasSuperAdminRole = roles.some((role) => role.name === roles_1.ROLES.SUPERADMIN);
        if (hasSuperAdminRole) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.CANNOT_ASSIGN_SUPERADMIN_ROLE);
        }
    }
    // Sync user roles in tenant (atomic operation using UserRole model)
    await UserRole_1.UserRole.syncUserRolesInTenant(userId, primaryTenant.id, roleIds);
    // Return updated user with roles
    return (0, exports.findUserById)(userId);
};
exports.updateUserRoles = updateUserRoles;
