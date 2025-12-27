"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaEmailOtp = void 0;
const BaseModel_1 = require("./BaseModel");
const User_1 = require("./User");
const date_1 = require("../utils/date");
/**
 * MfaEmailOtp Model
 * Represents a temporary email-based OTP code for multi-factor authentication
 * These codes are sent via email and expire after 5 minutes
 */
class MfaEmailOtp extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "mfa_email_otps";
    }
    userId;
    code;
    expiresAt;
    userAgent;
    ipAddress;
    // Relations
    user;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["userId", "code", "expiresAt"],
            properties: {
                id: { type: "string", format: "uuid" },
                userId: { type: "string", format: "uuid" },
                code: { type: "string", minLength: 1, maxLength: 255 },
                expiresAt: { type: "string", format: "date-time" },
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
                    from: "mfa_email_otps.user_id",
                    to: "users.id",
                },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with MfaEmailOtp-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only non-expired email OTP codes
            notExpired(query) {
                query.where("expires_at", ">", (0, date_1.getCurrentDate)());
            },
            // Only expired email OTP codes
            expired(query) {
                query.where("expires_at", "<=", (0, date_1.getCurrentDate)());
            },
        };
    }
    /**
     * Scope: Find by user ID and code (only valid, non-expired email OTP codes)
     */
    static async findByUserIdAndCode(userId, code) {
        return this.query()
            .modify("notDeleted")
            .modify("notExpired")
            .where({ userId, code })
            .first();
    }
    /**
     * Scope: Find by user ID (only valid, non-expired email OTP codes)
     */
    static async findByUserId(userId) {
        return this.query()
            .modify("notDeleted")
            .modify("notExpired")
            .where({ userId })
            .orderBy("created_at", "desc")
            .first();
    }
    /**
     * Scope: Find by code (only valid, non-expired email OTP codes)
     */
    static async findByCode(code) {
        return this.query()
            .modify("notDeleted")
            .modify("notExpired")
            .findOne({ code });
    }
    /**
     * Check if email OTP code is expired
     */
    isExpired() {
        return this.expiresAt <= (0, date_1.getCurrentDate)();
    }
    /**
     * Check if email OTP code is valid (not expired and not deleted)
     */
    isValid() {
        return !this.isExpired() && !this.isDeleted();
    }
    /**
     * Delete expired email OTP codes (cleanup method)
     */
    static async deleteExpired() {
        const deleted = await this.query().modify("expired").delete();
        return deleted;
    }
}
exports.MfaEmailOtp = MfaEmailOtp;
