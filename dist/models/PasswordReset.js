"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordReset = void 0;
const BaseModel_1 = require("./BaseModel");
const date_1 = require("../utils/date");
/**
 * PasswordReset Model
 * Represents a password reset token
 */
class PasswordReset extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "password_resets";
    }
    email;
    token;
    expiresAt;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["email", "token", "expiresAt"],
            properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", format: "email", maxLength: 255 },
                token: { type: "string", minLength: 1, maxLength: 255 },
                expiresAt: { type: "string", format: "date-time" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with PasswordReset-specific ones
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
     * Scope: Find by email and token (only valid, non-expired tokens)
     */
    static async findByEmailAndToken(email, token) {
        return this.query()
            .modify("notDeleted")
            .modify("notExpired")
            .findOne({ email, token });
    }
    /**
     * Scope: Find by email (only valid, non-expired tokens)
     */
    static async findByEmail(email) {
        return this.query()
            .modify("notDeleted")
            .modify("notExpired")
            .where({ email })
            .orderBy("created_at", "desc")
            .first();
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
}
exports.PasswordReset = PasswordReset;
