"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModel = void 0;
const objection_1 = require("objection");
const uuid_1 = require("uuid");
const date_1 = require("../utils/date");
/**
 * BaseModel
 * - UUID primary key
 * - Timestamps
 * - Soft deletes
 */
class BaseModel extends objection_1.Model {
    id; // UUID
    createdAt;
    updatedAt;
    deletedAt;
    /**
     * Table name must be implemented by child class
     */
    static get tableName() {
        throw new Error("tableName must be implemented by child class");
    }
    /**
     * JSON schema for validation
     */
    static get jsonSchema() {
        return {
            type: "object",
            required: [],
            properties: {
                id: { type: "string", format: "uuid" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    /**
     * Query builder modifiers for soft deletes
     */
    static get modifiers() {
        return {
            // Only non-deleted records
            notDeleted(query) {
                query.whereNull("deleted_at");
            },
            // Only deleted records
            deleted(query) {
                query.whereNotNull("deleted_at");
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
     * Before insert hook → set UUID and timestamps
     */
    $beforeInsert(_ctx) {
        if (!this.id)
            this.id = (0, uuid_1.v4)();
        const now = (0, date_1.getCurrentDate)();
        this.createdAt = now;
        this.updatedAt = now;
        this.deletedAt = null;
    }
    /**
     * Before update hook → update timestamp
     */
    $beforeUpdate(_opt, _ctx) {
        this.updatedAt = (0, date_1.getCurrentDate)();
    }
    /**
     * Helper: check if model is new (not saved yet)
     */
    isNew() {
        return !this.$id();
    }
    /**
     * Helper: get model's ID
     */
    getId() {
        return this.$id();
    }
    /**
     * Soft delete - mark as deleted instead of removing
     */
    async softDelete() {
        const deletedAt = (0, date_1.getCurrentISOString)();
        await this.$query().patch({ deletedAt });
        // Update the instance property after successful patch
        // Objection will convert Date to string when loading from DB
        const updated = await this.$query().findById(this.id);
        if (updated) {
            this.deletedAt = updated.deletedAt ?? null;
            this.updatedAt = updated.updatedAt;
        }
    }
    /**
     * Restore soft deleted record
     */
    async restore() {
        await this.$query().patch({ deletedAt: null });
        // Update the instance property after successful patch
        const updated = await this.$query().findById(this.id);
        if (updated) {
            this.deletedAt = updated.deletedAt ?? null;
            this.updatedAt = updated.updatedAt;
        }
    }
    /**
     * Check if record is soft deleted
     */
    isDeleted() {
        return this.deletedAt !== null && this.deletedAt !== undefined;
    }
}
exports.BaseModel = BaseModel;
