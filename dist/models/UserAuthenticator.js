"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAuthenticator = void 0;
const BaseModel_1 = require("./BaseModel");
const User_1 = require("./User");
/**
 * UserAuthenticator Model
 * Represents TOTP/authenticator app credentials for a user
 * Supports Google Authenticator, Microsoft Authenticator, etc.
 */
class UserAuthenticator extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "user_authenticators";
    }
    userId;
    type;
    secret;
    backupCodes;
    isActive;
    verifiedAt;
    lastUsedAt;
    deviceName;
    userAgent;
    ipAddress;
    // Relations
    user;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["userId", "type", "secret"],
            properties: {
                id: { type: "string", format: "uuid" },
                userId: { type: "string", format: "uuid" },
                type: { type: "string", enum: ["totp"] },
                secret: { type: "string", minLength: 1, maxLength: 500 },
                backupCodes: { type: ["string", "null"] },
                isActive: { type: "boolean", default: true },
                verifiedAt: { type: ["string", "null"], format: "date-time" },
                lastUsedAt: { type: ["string", "null"], format: "date-time" },
                deviceName: { type: ["string", "null"], maxLength: 255 },
                userAgent: { type: ["string", "null"], maxLength: 500 },
                ipAddress: { type: ["string", "null"], maxLength: 45 },
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
                    from: "user_authenticators.user_id",
                    to: "users.id",
                },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with UserAuthenticator-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only active authenticators
            active(query) {
                query.where("is_active", true);
            },
            // Only inactive authenticators
            inactive(query) {
                query.where("is_active", false);
            },
            // Only verified authenticators
            verified(query) {
                query.whereNotNull("verified_at");
            },
            // Only unverified authenticators
            unverified(query) {
                query.whereNull("verified_at");
            },
            // Filter by type
            byType(query, type) {
                query.where("type", type);
            },
            // Filter by user ID
            byUser(query, userId) {
                query.where("user_id", userId);
            },
        };
    }
    /**
     * Find active authenticator by user ID and type
     * @param userId - User ID
     * @param type - Authenticator type
     * @returns UserAuthenticator or undefined
     */
    static async findActiveByUserAndType(userId, type = "totp") {
        return this.query()
            .modify("notDeleted")
            .modify("active")
            .modify("verified")
            .modify("byUser", userId)
            .modify("byType", type)
            .first();
    }
    /**
     * Find all authenticators for a user
     * @param userId - User ID
     * @returns Array of UserAuthenticator
     */
    static async findByUser(userId) {
        return this.query().modify("notDeleted").modify("byUser", userId);
    }
    /**
     * Check if authenticator is verified
     */
    isVerified() {
        return !!this.verifiedAt;
    }
    /**
     * Check if authenticator is active and verified
     */
    isActiveAndVerified() {
        return this.isActive && this.isVerified() && !this.isDeleted();
    }
}
exports.UserAuthenticator = UserAuthenticator;
