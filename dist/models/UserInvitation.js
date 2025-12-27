"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInvitation = void 0;
const BaseModel_1 = require("./BaseModel");
const Tenant_1 = require("./Tenant");
const User_1 = require("./User");
/**
 * UserInvitation Model
 * Represents a user invitation for a specific tenant
 */
class UserInvitation extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "user_invitations";
    }
    userId;
    tenantId;
    invitedBy;
    roleId;
    token;
    // Relations
    user;
    tenant;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["userId", "tenantId", "invitedBy", "roleId", "token"],
            properties: {
                id: { type: "string", format: "uuid" },
                userId: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                invitedBy: { type: "string", format: "uuid" },
                roleId: { type: "string", format: "uuid" },
                token: { type: "string", minLength: 1, maxLength: 255 },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    /**
     * Relation mappings
     */
    static get relationMappings() {
        return {
            user: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: User_1.User,
                join: {
                    from: "user_invitations.user_id",
                    to: "users.id",
                },
            },
            tenant: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: Tenant_1.Tenant,
                join: {
                    from: "user_invitations.tenant_id",
                    to: "tenants.id",
                },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with UserInvitation-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
        };
    }
    /**
     * Scope: Find by token (only valid, non-deleted invitations)
     */
    static async findByToken(token) {
        return this.query()
            .modify("notDeleted")
            .findOne({ token })
            .withGraphFetched("[user, tenant]");
    }
    /**
     * Scope: Find by user and tenant (only valid, non-deleted invitations)
     */
    static async findByUserAndTenant(userId, tenantId) {
        return this.query()
            .modify("notDeleted")
            .findOne({ user_id: userId, tenant_id: tenantId })
            .withGraphFetched("[user, tenant]");
    }
    /**
     * Scope: Find by user (only valid, non-deleted invitations)
     */
    static async findByUser(userId) {
        return this.query()
            .modify("notDeleted")
            .where({ user_id: userId })
            .withGraphFetched("[user, tenant]");
    }
    /**
     * Scope: Find by tenant (only valid, non-deleted invitations)
     */
    static async findByTenant(tenantId) {
        return this.query()
            .modify("notDeleted")
            .where({ tenant_id: tenantId })
            .withGraphFetched("[user, tenant]");
    }
}
exports.UserInvitation = UserInvitation;
