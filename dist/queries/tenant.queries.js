"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRoleToUserForTenant = exports.switchUserTenant = exports.associateUserWithTenant = exports.restoreTenant = exports.deleteTenant = exports.updateTenant = exports.createTenant = exports.findTenantBySchemaName = exports.findTenantById = exports.findTenants = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const pagination_1 = require("../constants/pagination");
const Tenant_1 = require("../models/Tenant");
const UserRole_1 = require("../models/UserRole");
const UserTenant_1 = require("../models/UserTenant");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
/**
 * Map sort field to database column
 */
const mapSortField = (field) => {
    const fieldMap = {
        name: "name",
        schemaName: "schema_name",
        isActive: "is_active",
        createdAt: "created_at",
        updatedAt: "updated_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "created_at";
};
/**
 * Find tenants with pagination, sorting, search, and filtering
 * @param filters - Filter, pagination, and sorting parameters
 * @param userId - Optional user ID to filter tenants by user membership
 * @returns Object containing tenants array and total count
 */
const findTenants = async (filters, userId) => {
    const { page = pagination_1.PAGINATION_DEFAULTS.PAGE_DEFAULT, limit = pagination_1.PAGINATION_DEFAULTS.LIMIT_DEFAULT, sort = "createdAt", order = "asc", search, isActive, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapSortField(sort);
    // Build base query
    let query = Tenant_1.Tenant.query().modify("notDeleted");
    // Filter by user membership if userId is provided
    if (userId) {
        query = query
            .join("user_tenants", "tenants.id", "user_tenants.tenant_id")
            .where("user_tenants.user_id", userId)
            .groupBy("tenants.id");
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
    // Apply pagination and sorting
    const tenants = await query
        .orderBy(sortColumn, order)
        .limit(limit)
        .offset(offset);
    return { tenants, total };
};
exports.findTenants = findTenants;
/**
 * Find tenant by ID
 * @param tenantId - Tenant ID (UUID)
 * @returns Tenant object
 * @throws ApiError if tenant not found
 */
const findTenantById = async (tenantId) => {
    const tenant = await Tenant_1.Tenant.query().modify("notDeleted").findById(tenantId);
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    return tenant;
};
exports.findTenantById = findTenantById;
/**
 * Find tenant by schema name
 * @param schemaName - Schema name
 * @returns Tenant object or undefined
 */
const findTenantBySchemaName = async (schemaName) => {
    return Tenant_1.Tenant.findBySchemaName(schemaName);
};
exports.findTenantBySchemaName = findTenantBySchemaName;
/**
 * Create tenant
 * @param data - Tenant data
 * @returns Created tenant
 */
const createTenant = async (data) => {
    // Check if schema name already exists
    const existingTenant = await (0, exports.findTenantBySchemaName)(data.schemaName);
    if (existingTenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.TENANT_SCHEMA_ALREADY_EXISTS);
    }
    const tenant = await Tenant_1.Tenant.query().insert({
        name: data.name,
        schemaName: data.schemaName,
        isActive: data.isActive ?? true,
    });
    return tenant;
};
exports.createTenant = createTenant;
/**
 * Update tenant
 * @param tenantId - Tenant ID
 * @param data - Update data
 * @returns Updated tenant
 */
const updateTenant = async (tenantId, data) => {
    const tenant = await (0, exports.findTenantById)(tenantId);
    const updatedTenant = await tenant.$query().patchAndFetch(data);
    return updatedTenant;
};
exports.updateTenant = updateTenant;
/**
 * Delete tenant (soft delete)
 * @param tenantId - Tenant ID
 * @returns Deleted tenant
 */
const deleteTenant = async (tenantId) => {
    const tenant = await (0, exports.findTenantById)(tenantId);
    // Soft delete the tenant
    await tenant.softDelete();
    // Reload the tenant directly (without notDeleted modifier) to get the updated data
    const deletedTenant = await Tenant_1.Tenant.query().findById(tenantId);
    if (!deletedTenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    return deletedTenant;
};
exports.deleteTenant = deleteTenant;
/**
 * Restore tenant (un-soft delete)
 * @param tenantId - Tenant ID
 * @returns Restored tenant
 */
const restoreTenant = async (tenantId) => {
    const tenant = await Tenant_1.Tenant.query()
        .where("id", tenantId)
        .whereNotNull("deleted_at")
        .first();
    if (!tenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND_OR_NOT_DELETED);
    }
    // Restore the tenant
    await tenant.restore();
    // Reload to get updated data
    const restoredTenant = await Tenant_1.Tenant.query().findById(tenantId);
    if (!restoredTenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
    return restoredTenant;
};
exports.restoreTenant = restoreTenant;
/**
 * Associate user with tenant
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @param isPrimary - Whether this is the primary tenant for the user
 * @returns void
 */
const associateUserWithTenant = async (userId, tenantId, isPrimary = false) => {
    // Check if association already exists
    const existing = await UserTenant_1.UserTenant.query()
        .where("userId", userId)
        .where("tenantId", tenantId)
        .first();
    if (existing) {
        // Update is_primary if needed
        if (existing.isPrimary !== isPrimary) {
            await existing.$query().patch({ isPrimary });
        }
        return;
    }
    // If this is primary, unset other primary tenants for this user
    if (isPrimary) {
        await UserTenant_1.UserTenant.query()
            .where("userId", userId)
            .where("isPrimary", true)
            .patch({ isPrimary: false });
    }
    // Create association
    await UserTenant_1.UserTenant.query().insert({
        userId: userId,
        tenantId: tenantId,
        isPrimary: isPrimary,
    });
};
exports.associateUserWithTenant = associateUserWithTenant;
/**
 * Switch user's primary tenant
 * Updates is_primary flag in user_tenants table
 * @param userId - User ID
 * @param tenantId - Tenant ID to switch to
 * @returns void
 * @throws ApiError if user doesn't belong to tenant
 */
const switchUserTenant = async (userId, tenantId) => {
    // Verify user belongs to tenant
    const userTenant = await UserTenant_1.UserTenant.findByUserAndTenant(userId, tenantId);
    if (!userTenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
    }
    // If already primary, no need to update
    if (userTenant.isPrimary) {
        return;
    }
    // Unset all other primary tenants for this user
    await UserTenant_1.UserTenant.query()
        .where("user_id", userId)
        .where("is_primary", true)
        .patch({ isPrimary: false });
    // Set this tenant as primary
    await userTenant.$query().patch({ isPrimary: true });
};
exports.switchUserTenant = switchUserTenant;
/**
 * Assign role to user for tenant
 * @param userId - User ID
 * @param roleId - Role ID
 * @param tenantId - Tenant ID
 * @returns void
 */
const assignRoleToUserForTenant = async (userId, roleId, tenantId) => {
    // Assign role using UserRole model (idempotent)
    await UserRole_1.UserRole.assignRole(userId, roleId, tenantId);
};
exports.assignRoleToUserForTenant = assignRoleToUserForTenant;
