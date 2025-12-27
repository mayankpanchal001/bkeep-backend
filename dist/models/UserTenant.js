"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTenant = void 0;
const objection_1 = require("objection");
const Tenant_1 = require("./Tenant");
const User_1 = require("./User");
const date_1 = require("../utils/date");
/**
 * UserTenant Model
 * Represents the many-to-many relationship between users and tenants
 * This is a pivot table with composite primary key (user_id + tenant_id)
 */
class UserTenant extends objection_1.Model {
    // Table name
    static get tableName() {
        return "user_tenants";
    }
    // Model properties
    userId;
    tenantId;
    isPrimary;
    createdAt;
    // Relations
    user;
    tenant;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["userId", "tenantId", "isPrimary"],
            properties: {
                userId: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                isPrimary: { type: "boolean", default: false },
                createdAt: { type: "string", format: "date-time" },
            },
        };
    }
    /**
     * Map JS camelCase properties <-> DB snake_case columns
     */
    static get columnNameMappers() {
        return (0, objection_1.snakeCaseMappers)();
    }
    /**
     * Composite primary key
     */
    static get idColumn() {
        return ["user_id", "tenant_id"];
    }
    /**
     * Relation mappings
     */
    static get relationMappings() {
        return {
            user: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: User_1.User,
                join: {
                    from: "user_tenants.user_id",
                    to: "users.id",
                },
            },
            tenant: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: Tenant_1.Tenant,
                join: {
                    from: "user_tenants.tenant_id",
                    to: "tenants.id",
                },
            },
        };
    }
    /**
     * Before insert hook → set timestamp
     */
    $beforeInsert() {
        if (!this.createdAt) {
            this.createdAt = (0, date_1.getCurrentDate)();
        }
    }
    /**
     * Find user-tenant relationship
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns UserTenant or undefined
     */
    static async findByUserAndTenant(userId, tenantId) {
        return this.query()
            .where("user_id", userId)
            .where("tenant_id", tenantId)
            .first();
    }
    /**
     * Find all tenants for a user
     * @param userId - User ID
     * @returns Array of UserTenant with tenant details
     */
    static async findByUser(userId) {
        return this.query().where("user_id", userId).withGraphFetched("tenant");
    }
    /**
     * Find all users in a tenant
     * @param tenantId - Tenant ID
     * @returns Array of UserTenant with user details
     */
    static async findByTenant(tenantId) {
        return this.query().where("tenant_id", tenantId).withGraphFetched("user");
    }
    /**
     * Check if user is member of tenant
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns boolean
     */
    static async isMember(userId, tenantId) {
        const userTenant = await this.findByUserAndTenant(userId, tenantId);
        return !!userTenant;
    }
    /**
     * Add user to tenant
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @param isPrimary - Whether this is the primary tenant (default: false)
     * @returns Created UserTenant
     */
    static async addUserToTenant(userId, tenantId, isPrimary = false) {
        // Check if relationship already exists
        const existing = await this.findByUserAndTenant(userId, tenantId);
        if (existing) {
            // Update isPrimary if needed
            if (existing.isPrimary !== isPrimary) {
                return this.query().patchAndFetchById([userId, tenantId], {
                    isPrimary,
                });
            }
            return existing;
        }
        // Create new relationship
        return this.query().insert({
            userId,
            tenantId,
            isPrimary,
        });
    }
    /**
     * Remove user from tenant
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns Number of deleted rows
     */
    static async removeUserFromTenant(userId, tenantId) {
        return this.query()
            .delete()
            .where("user_id", userId)
            .where("tenant_id", tenantId);
    }
    /**
     * Set primary tenant for user
     * @param userId - User ID
     * @param tenantId - Tenant ID
     */
    static async setPrimaryTenant(userId, tenantId) {
        // First, unset all primary flags for this user
        await this.query().where("user_id", userId).patch({ isPrimary: false });
        // Then set the specified tenant as primary
        await this.query()
            .where("user_id", userId)
            .where("tenant_id", tenantId)
            .patch({ isPrimary: true });
    }
    /**
     * Get user's primary tenant
     * @param userId - User ID
     * @returns UserTenant with tenant details or undefined
     */
    static async getPrimaryTenant(userId) {
        return this.query()
            .where("user_id", userId)
            .where("is_primary", true)
            .withGraphFetched("tenant")
            .first();
    }
    /**
     * Get pivot data (is_primary flag) for a user-tenant relationship
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns Object with isPrimary flag or undefined
     */
    static async getPivotData(userId, tenantId) {
        const userTenant = await this.findByUserAndTenant(userId, tenantId);
        return userTenant ? { isPrimary: userTenant.isPrimary } : undefined;
    }
    /**
     * Remove all users from a tenant (used during tenant cleanup)
     * @param tenantId - Tenant ID
     * @returns Number of deleted rows
     */
    static async removeAllUsersFromTenant(tenantId) {
        return this.query().delete().where("tenant_id", tenantId);
    }
    /**
     * Remove user from all tenants (used during user cleanup)
     * @param userId - User ID
     * @returns Number of deleted rows
     */
    static async removeUserFromAllTenants(userId) {
        return this.query().delete().where("user_id", userId);
    }
}
exports.UserTenant = UserTenant;
