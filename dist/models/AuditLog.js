"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const objection_1 = require("objection");
const uuid_1 = require("uuid");
const date_1 = require("../utils/date");
/**
 * AuditLog Model
 * Represents an audit trail entry for system operations
 */
class AuditLog extends objection_1.Model {
    // Table name
    static get tableName() {
        return "audit_logs";
    }
    // Model properties
    id;
    action;
    actor;
    targets;
    tenantId;
    context;
    success;
    occurredAt;
    createdAt;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: [
                "action",
                "actor",
                "targets",
                "tenantId",
                "context",
                "success",
            ],
            properties: {
                id: { type: "string", format: "uuid" },
                action: {
                    type: "string",
                    // Supports both enum values and namespaced string actions (e.g., 'user.logged_in')
                },
                actor: {
                    type: "object",
                    required: ["type", "id"],
                    properties: {
                        type: { type: "string", enum: ["user", "system", "api_key"] },
                        id: { type: "string" },
                        email: { type: ["string", "null"] },
                        name: { type: ["string", "null"] },
                    },
                },
                targets: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["type", "id"],
                        properties: {
                            type: { type: "string" },
                            id: { type: "string" },
                        },
                    },
                },
                tenantId: { type: "string", format: "uuid" },
                context: { type: "object" },
                success: { type: "boolean" },
                occurredAt: { type: "string", format: "date-time" },
                createdAt: { type: "string", format: "date-time" },
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
    $beforeInsert() {
        if (!this.id)
            this.id = (0, uuid_1.v4)();
        const now = (0, date_1.getCurrentDate)();
        if (!this.createdAt) {
            this.createdAt = now;
        }
        if (!this.occurredAt) {
            this.occurredAt = now;
        }
        // Convert Date objects to ISO strings for JSON schema validation
        // Objection.js JSON schema expects strings, but will convert back to Date when reading
        if (this.createdAt instanceof Date) {
            this.createdAt = this.createdAt.toISOString();
        }
        if (this.occurredAt instanceof Date) {
            this.occurredAt = this.occurredAt.toISOString();
        }
    }
    /**
     * Query builder modifiers
     */
    static get modifiers() {
        return {
            // Filter by action
            byAction(query, action) {
                query.where("action", action);
            },
            // Filter by tenant ID
            byTenantId(query, tenantId) {
                query.where("tenant_id", tenantId);
            },
            // Filter by success status
            bySuccess(query, success) {
                query.where("success", success);
            },
            // Order by occurred date (newest first)
            newestFirst(query) {
                query.orderBy("occurred_at", "desc");
            },
            // Order by occurred date (oldest first)
            oldestFirst(query) {
                query.orderBy("occurred_at", "asc");
            },
        };
    }
}
exports.AuditLog = AuditLog;
