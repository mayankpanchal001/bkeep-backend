"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
const objection_1 = require("objection");
const Role_1 = require("./Role");
const Tenant_1 = require("./Tenant");
const User_1 = require("./User");
const date_1 = require("../utils/date");
/**
 * UserRole Model
 * Represents the many-to-many relationship between users, roles, and tenants
 * This is a pivot table with composite primary key (user_id + role_id + tenant_id)
 * A user can have different roles in different tenants
 */
class UserRole extends objection_1.Model {
    // Table name
    static get tableName() {
        return "user_roles";
    }
    // Model properties
    userId;
    roleId;
    tenantId;
    createdAt;
    // Relations
    user;
    role;
    tenant;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["userId", "roleId", "tenantId"],
            properties: {
                userId: { type: "string", format: "uuid" },
                roleId: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
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
     * Composite primary key (user_id + role_id + tenant_id)
     */
    static get idColumn() {
        return ["user_id", "role_id", "tenant_id"];
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
                    from: "user_roles.user_id",
                    to: "users.id",
                },
            },
            role: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: Role_1.Role,
                join: {
                    from: "user_roles.role_id",
                    to: "roles.id",
                },
            },
            tenant: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: Tenant_1.Tenant,
                join: {
                    from: "user_roles.tenant_id",
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
     * Find user roles by tenant
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns Array of UserRole with role details
     */
    static async findByUserAndTenant(userId, tenantId) {
        return this.query()
            .where("user_id", userId)
            .where("tenant_id", tenantId)
            .withGraphFetched("role");
    }
    /**
     * Find users by role and tenant
     * @param roleId - Role ID
     * @param tenantId - Tenant ID
     * @returns Array of UserRole with user details
     */
    static async findByRoleAndTenant(roleId, tenantId) {
        return this.query()
            .where("role_id", roleId)
            .where("tenant_id", tenantId)
            .withGraphFetched("user");
    }
    /**
     * Find all roles for a user across all tenants
     * @param userId - User ID
     * @returns Array of UserRole with role and tenant details
     */
    static async findByUser(userId) {
        return this.query()
            .where("user_id", userId)
            .withGraphFetched("[role, tenant]");
    }
    /**
     * Check if a user has a specific role in a tenant
     * @param userId - User ID
     * @param roleId - Role ID
     * @param tenantId - Tenant ID
     * @returns boolean
     */
    static async hasRole(userId, roleId, tenantId) {
        const userRole = await this.query()
            .where("user_id", userId)
            .where("role_id", roleId)
            .where("tenant_id", tenantId)
            .first();
        return !!userRole;
    }
    /**
     * Assign a role to a user in a tenant
     * @param userId - User ID
     * @param roleId - Role ID
     * @param tenantId - Tenant ID
     * @returns Created UserRole
     */
    static async assignRole(userId, roleId, tenantId) {
        // Check if assignment already exists
        const existing = await this.query()
            .where("user_id", userId)
            .where("role_id", roleId)
            .where("tenant_id", tenantId)
            .first();
        if (existing) {
            return existing;
        }
        // Create new assignment
        return this.query().insert({
            userId,
            roleId,
            tenantId,
        });
    }
    /**
     * Remove a role from a user in a tenant
     * @param userId - User ID
     * @param roleId - Role ID
     * @param tenantId - Tenant ID
     * @returns Number of deleted rows
     */
    static async removeRole(userId, roleId, tenantId) {
        return this.query()
            .delete()
            .where("user_id", userId)
            .where("role_id", roleId)
            .where("tenant_id", tenantId);
    }
    /**
     * Remove all roles from a user in a tenant
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns Number of deleted rows
     */
    static async removeAllUserRolesInTenant(userId, tenantId) {
        return this.query()
            .delete()
            .where("user_id", userId)
            .where("tenant_id", tenantId);
    }
    /**
     * Sync user roles in a tenant (replace all roles with the given ones)
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @param roleIds - Array of role IDs to assign
     */
    static async syncUserRolesInTenant(userId, tenantId, roleIds) {
        // Remove all existing roles for this user in this tenant
        await this.removeAllUserRolesInTenant(userId, tenantId);
        // Assign new roles
        if (roleIds.length > 0) {
            const userRoles = roleIds.map((roleId) => ({
                userId,
                roleId,
                tenantId,
            }));
            await this.query().insert(userRoles);
        }
    }
}
exports.UserRole = UserRole;
