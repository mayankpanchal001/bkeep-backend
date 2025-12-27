"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPasskey = void 0;
const BaseModel_1 = require("./BaseModel");
/**
 * UserPasskey Model
 * Represents a WebAuthn/FIDO2 passkey credential for a user
 */
class UserPasskey extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "user_passkeys";
    }
    userId;
    credentialId;
    publicKey;
    counter;
    credentialType;
    transports;
    aaguid;
    name;
    isActive;
    lastUsedAt;
    userAgent;
    ipAddress;
    backupEligible;
    backupState;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["userId", "credentialId", "publicKey", "counter", "name"],
            properties: {
                id: { type: "string", format: "uuid" },
                userId: { type: "string", format: "uuid" },
                credentialId: { type: "string", minLength: 1, maxLength: 1024 },
                publicKey: { type: "string", minLength: 1 },
                counter: { type: "integer", minimum: 0 },
                credentialType: {
                    type: "string",
                    enum: ["platform", "roaming"],
                    default: "platform",
                },
                transports: {
                    type: ["array", "null"],
                    items: {
                        type: "string",
                        enum: ["internal", "usb", "nfc", "ble", "hybrid"],
                    },
                },
                aaguid: { type: ["string", "null"], maxLength: 255 },
                name: { type: "string", minLength: 1, maxLength: 255 },
                isActive: { type: "boolean", default: true },
                lastUsedAt: { type: ["string", "null"], format: "date-time" },
                userAgent: { type: ["string", "null"], maxLength: 500 },
                ipAddress: { type: ["string", "null"], maxLength: 45 },
                backupEligible: { type: "boolean", default: false },
                backupState: { type: "boolean", default: false },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with UserPasskey-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only active passkeys
            active(query) {
                query.where("is_active", true);
            },
            // Only inactive passkeys
            inactive(query) {
                query.where("is_active", false);
            },
            // Filter by user ID
            byUser(query, userId) {
                query.where("user_id", userId);
            },
            // Filter by credential type
            byType(query, credentialType) {
                query.where("credential_type", credentialType);
            },
        };
    }
    /**
     * Check if passkey is active
     */
    isPasskeyActive() {
        return this.isActive && !this.deletedAt;
    }
    /**
     * Find active passkey by user ID and credential ID
     */
    static async findActiveByUserAndCredentialId(userId, credentialId) {
        return this.query()
            .modify("notDeleted")
            .modify("active")
            .modify("byUser", userId)
            .where("credential_id", credentialId)
            .first();
    }
    /**
     * Find all active passkeys for a user
     */
    static async findActiveByUser(userId) {
        return this.query()
            .modify("notDeleted")
            .modify("active")
            .modify("byUser", userId)
            .orderBy("last_used_at", "desc")
            .orderBy("created_at", "desc");
    }
    /**
     * Find passkey by credential ID (for authentication)
     */
    static async findByCredentialId(credentialId) {
        return this.query()
            .modify("notDeleted")
            .modify("active")
            .where("credential_id", credentialId)
            .first();
    }
    /**
     * Count active passkeys for a user
     */
    static async countActiveByUser(userId) {
        const result = (await this.query()
            .modify("notDeleted")
            .modify("active")
            .modify("byUser", userId)
            .count("* as count")
            .first());
        return Number.parseInt(String(result?.count ?? "0")) || 0;
    }
}
exports.UserPasskey = UserPasskey;
