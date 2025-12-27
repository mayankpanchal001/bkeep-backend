"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const BaseModel_1 = require("./BaseModel");
const Role_1 = require("./Role");
const Tenant_1 = require("./Tenant");
/**
 * User Model
 * Represents a user account in the system
 */
class User extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "users";
    }
    name;
    email;
    passwordHash;
    isVerified;
    verifiedAt;
    isActive;
    mfaEnabled;
    lastLoggedInAt;
    // Relations
    tenants;
    roles;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["name", "email", "passwordHash"],
            properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", minLength: 1, maxLength: 255 },
                email: { type: "string", format: "email", maxLength: 255 },
                passwordHash: { type: "string", minLength: 1, maxLength: 255 },
                isVerified: { type: "boolean", default: false },
                verifiedAt: { type: ["string", "null"], format: "date-time" },
                isActive: { type: "boolean", default: true },
                mfaEnabled: { type: "boolean", default: false },
                lastLoggedInAt: { type: ["string", "null"], format: "date-time" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    /**
     * Relations
     */
    static get relationMappings() {
        return {
            tenants: {
                relation: BaseModel_1.BaseModel.ManyToManyRelation,
                modelClass: Tenant_1.Tenant,
                join: {
                    from: "users.id",
                    through: {
                        from: "user_tenants.user_id",
                        to: "user_tenants.tenant_id",
                        extra: {
                            isPrimary: "is_primary",
                            createdAt: "created_at",
                        },
                    },
                    to: "tenants.id",
                },
            },
            roles: {
                relation: BaseModel_1.BaseModel.ManyToManyRelation,
                modelClass: Role_1.Role,
                join: {
                    from: "users.id",
                    through: {
                        from: "user_roles.user_id",
                        to: "user_roles.role_id",
                        extra: {
                            tenantId: "tenant_id",
                            createdAt: "created_at",
                        },
                    },
                    to: "roles.id",
                },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with User-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only verified users
            verified(query) {
                query.where("is_verified", true);
            },
            // Only unverified users
            unverified(query) {
                query.where("is_verified", false);
            },
            // Only active users (is_active = true)
            active(query) {
                query.where("is_active", true);
            },
            // Only inactive users (is_active = false)
            inactive(query) {
                query.where("is_active", false);
            },
            // Search by name or email
            search(query, searchTerm) {
                query.where((builder) => {
                    builder
                        .where("name", "ilike", `%${searchTerm}%`)
                        .orWhere("email", "ilike", `%${searchTerm}%`);
                });
            },
        };
    }
    /**
     * Scope: Find by email (only active, non-deleted users)
     */
    static async findByEmail(email) {
        return this.query().modify("notDeleted").findOne({ email });
    }
    /**
     * Scope: Find verified users
     */
    static async findVerified() {
        return this.query().modify("notDeleted").modify("verified");
    }
    /**
     * Scope: Search by term (only active, non-deleted users)
     */
    static async search(term) {
        return this.query().modify("notDeleted").modify("search", term);
    }
    /**
     * Get primary tenant for this user
     * @returns Primary tenant or undefined if no tenant exists
     */
    async getPrimaryTenant() {
        const tenants = (await this.$relatedQuery("tenants")
            .where("user_tenants.is_primary", true)
            .limit(1));
        return tenants[0];
    }
    /**
     * Scope: Find users by tenant
     */
    static async findByTenant(tenantId) {
        return this.query()
            .modify("notDeleted")
            .join("user_tenants", "users.id", "user_tenants.user_id")
            .where("user_tenants.tenant_id", tenantId);
    }
    /**
     * Check if user has a specific permission
     */
    async hasPermission(permissionName, tenantId) {
        const roles = await this.$relatedQuery("roles")
            .modify("notDeleted")
            .modify("active")
            .where((builder) => {
            if (tenantId) {
                builder.where("user_roles.tenant_id", tenantId);
            }
        })
            .withGraphFetched("permissions");
        for (const role of roles) {
            if (role.permissions) {
                const hasPermission = role.permissions.some((perm) => perm.name === permissionName && perm.isActive && !perm.deletedAt);
                if (hasPermission)
                    return true;
            }
        }
        return false;
    }
    /**
     * Check if user has a specific role
     */
    async hasRole(roleName, tenantId) {
        const baseQuery = this.$relatedQuery("roles")
            .modify("notDeleted")
            .modify("active")
            .where("roles.name", roleName);
        const query = tenantId
            ? baseQuery.where("user_roles.tenant_id", tenantId)
            : baseQuery;
        const count = await query.resultSize();
        return count > 0;
    }
}
exports.User = User;
