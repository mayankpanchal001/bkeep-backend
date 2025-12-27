"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenExpiry = exports.RefreshToken = void 0;
const moment_1 = __importDefault(require("moment"));
const BaseModel_1 = require("./BaseModel");
const User_1 = require("./User");
const date_1 = require("../utils/date");
/**
 * RefreshToken Model
 * Represents a refresh token for JWT authentication
 */
class RefreshToken extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "refresh_tokens";
    }
    userId;
    token;
    expiresAt;
    userAgent;
    ipAddress;
    // Relations
    user;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["userId", "token", "expiresAt"],
            properties: {
                id: { type: "string", format: "uuid" },
                userId: { type: "string", format: "uuid" },
                token: { type: "string", minLength: 1 },
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
     * Relations
     */
    static get relationMappings() {
        return {
            user: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: User_1.User,
                join: {
                    from: "refresh_tokens.user_id",
                    to: "users.id",
                },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with RefreshToken-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only non-expired tokens
            notExpired(query) {
                query.where("expires_at", ">", (0, date_1.getCurrentDate)());
            },
            // Only expired tokens
            expired(query) {
                query.where("expires_at", "<=", (0, date_1.getCurrentDate)());
            },
        };
    }
    /**
     * Scope: Find by token (only valid, non-expired tokens)
     */
    static async findByToken(token) {
        return this.query()
            .modify("notDeleted")
            .modify("notExpired")
            .findOne({ token });
    }
    /**
     * Scope: Find by user ID (only valid, non-expired tokens)
     */
    static async findByUserId(userId) {
        return this.query()
            .modify("notDeleted")
            .modify("notExpired")
            .where({ userId })
            .orderBy("created_at", "desc");
    }
    /**
     * Check if token is expired
     */
    isExpired() {
        return this.expiresAt <= (0, date_1.getCurrentDate)();
    }
    /**
     * Check if token is valid (not expired and not deleted)
     */
    isValid() {
        return !this.isExpired() && !this.isDeleted();
    }
    /**
     * Delete expired tokens (cleanup method)
     */
    static async deleteExpired() {
        const deleted = await this.query().modify("expired").delete();
        return deleted;
    }
    /**
     * Revoke all tokens for a user
     */
    static async revokeAllForUser(userId) {
        const deleted = await this.query()
            .modify("notDeleted")
            .where("user_id", userId)
            .patch({ deletedAt: (0, date_1.getCurrentISOString)() });
        return deleted;
    }
}
exports.RefreshToken = RefreshToken;
/**
 * Calculate token expiry date from JWT token string
 * @param token - JWT token string
 * @returns Expiry date
 */
const getTokenExpiry = (token) => {
    // Decode token without verification to get expiry
    const decoded = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64").toString());
    const exp = decoded.exp;
    if (!exp) {
        throw new Error("Token does not have expiry claim");
    }
    return moment_1.default.unix(exp).utc().toDate();
};
exports.getTokenExpiry = getTokenExpiry;
