"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const BaseModel_1 = require("./BaseModel");
const Permission_1 = require("./Permission");
const User_1 = require("./User");
/**
 * Role Model
 * Represents a role in the RBAC system
 */
class Role extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "roles";
    }
    name;
    displayName;
    description;
    isActive;
    // Relations
    permissions;
    users;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["name", "displayName"],
            properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", minLength: 1, maxLength: 255 },
                displayName: { type: "string", minLength: 1, maxLength: 255 },
                description: { type: ["string", "null"], maxLength: 1000 },
                isActive: { type: "boolean", default: true },
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
            permissions: {
                relation: BaseModel_1.BaseModel.ManyToManyRelation,
                modelClass: Permission_1.Permission,
                join: {
                    from: "roles.id",
                    through: {
                        from: "role_permissions.role_id",
                        to: "role_permissions.permission_id",
                        extra: {
                            createdAt: "created_at",
                        },
                    },
                    to: "permissions.id",
                },
            },
            users: {
                relation: BaseModel_1.BaseModel.ManyToManyRelation,
                modelClass: User_1.User,
                join: {
                    from: "roles.id",
                    through: {
                        from: "user_roles.role_id",
                        to: "user_roles.user_id",
                        extra: {
                            tenantId: "tenant_id",
                            createdAt: "created_at",
                        },
                    },
                    to: "users.id",
                },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with Role-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only active roles (is_active = true)
            active(query) {
                query.where("is_active", true);
            },
            // Only inactive roles (is_active = false)
            inactive(query) {
                query.where("is_active", false);
            },
            // Search by name or display name
            search(query, searchTerm) {
                query.where((builder) => {
                    builder
                        .where("name", "ilike", `%${searchTerm}%`)
                        .orWhere("display_name", "ilike", `%${searchTerm}%`);
                });
            },
        };
    }
    /**
     * Scope: Find by name (only active, non-deleted roles)
     */
    static async findByName(name) {
        return this.query().modify("notDeleted").modify("active").findOne({ name });
    }
    /**
     * Scope: Get only active (non-deleted) roles
     */
    static async findActive() {
        return this.query().modify("notDeleted").modify("active");
    }
    /**
     * Scope: Search by term (only active, non-deleted roles)
     */
    static async search(term) {
        return this.query()
            .modify("notDeleted")
            .modify("active")
            .modify("search", term);
    }
    /**
     * Attach a permission to this role
     */
    async attachPermission(permissionId) {
        await this.$relatedQuery("permissions").relate(permissionId);
    }
    /**
     * Detach a permission from this role
     */
    async detachPermission(permissionId) {
        await this.$relatedQuery("permissions")
            .unrelate()
            .where("permissions.id", permissionId);
    }
    /**
     * Sync permissions (replace all permissions with the given ones)
     */
    async syncPermissions(permissionIds) {
        await this.$relatedQuery("permissions").unrelate();
        if (permissionIds.length > 0) {
            await this.$relatedQuery("permissions").relate(permissionIds);
        }
    }
}
exports.Role = Role;
