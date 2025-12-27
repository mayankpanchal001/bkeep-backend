"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = void 0;
const BaseModel_1 = require("./BaseModel");
const Role_1 = require("./Role");
/**
 * Permission Model
 * Represents a permission in the RBAC system
 */
class Permission extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "permissions";
    }
    name;
    displayName;
    description;
    isActive;
    // Relations
    roles;
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
            roles: {
                relation: BaseModel_1.BaseModel.ManyToManyRelation,
                modelClass: Role_1.Role,
                join: {
                    from: "permissions.id",
                    through: {
                        from: "role_permissions.permission_id",
                        to: "role_permissions.role_id",
                        extra: {
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
     * Extends BaseModel modifiers with Permission-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only active permissions (is_active = true)
            active(query) {
                query.where("is_active", true);
            },
            // Only inactive permissions (is_active = false)
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
     * Scope: Find by name (only active, non-deleted permissions)
     */
    static async findByName(name) {
        return this.query().modify("notDeleted").modify("active").findOne({ name });
    }
    /**
     * Scope: Get only active (non-deleted) permissions
     */
    static async findActive() {
        return this.query().modify("notDeleted").modify("active");
    }
    /**
     * Scope: Search by term (only active, non-deleted permissions)
     */
    static async search(term) {
        return this.query()
            .modify("notDeleted")
            .modify("active")
            .modify("search", term);
    }
}
exports.Permission = Permission;
