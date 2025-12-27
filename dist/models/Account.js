"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
const BaseModel_1 = require("./BaseModel");
/**
 * Account Model
 * Represents a bank account in a tenant-specific schema
 * Note: This model works with tenant-specific schemas, not the public schema
 */
class Account extends BaseModel_1.BaseModel {
    // Table name
    static get tableName() {
        return "accounts";
    }
    tenantId;
    createdBy;
    name;
    number;
    type;
    currencyCode;
    openingBalance;
    currentBalance;
    bankName;
    isActive;
    lastReconciledAt;
    reconciledBalance;
    lastReconciledBy;
    // JSON Schema for validation
    static get jsonSchema() {
        return {
            type: "object",
            required: ["tenantId", "createdBy", "name", "currencyCode"],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
                name: { type: "string", minLength: 1, maxLength: 255 },
                number: { type: ["string", "null"], maxLength: 255 },
                type: { type: "string", minLength: 1, maxLength: 255 },
                currencyCode: { type: "string", minLength: 3, maxLength: 3 },
                openingBalance: { type: "number", default: 0 },
                currentBalance: { type: "number", default: 0 },
                bankName: { type: ["string", "null"], maxLength: 255 },
                isActive: { type: "boolean", default: true },
                lastReconciledAt: { type: ["string", "null"], format: "date-time" },
                reconciledBalance: { type: ["number", "null"] },
                lastReconciledBy: { type: ["string", "null"], format: "uuid" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    /**
     * Query builder modifiers
     * Extends BaseModel modifiers with Account-specific ones
     */
    static get modifiers() {
        return {
            ...super.modifiers,
            // Only active accounts (is_active = true)
            active(query) {
                query.where("is_active", true);
            },
            // Only inactive accounts (is_active = false)
            inactive(query) {
                query.where("is_active", false);
            },
            // Search by name or number
            search(query, searchTerm) {
                query.where((builder) => {
                    builder
                        .where("name", "ilike", `%${searchTerm}%`)
                        .orWhere("number", "ilike", `%${searchTerm}%`);
                });
            },
            // Filter by tenant
            byTenant(query, tenantId) {
                query.where("tenant_id", tenantId);
            },
        };
    }
    /**
     * Get query builder for a specific tenant schema
     * @param knex - Knex instance configured for tenant schema
     * @returns Query builder for Account model in tenant schema
     */
    static queryForTenant(knex) {
        return this.query(knex);
    }
    /**
     * Scope: Find by tenant (only active, non-deleted accounts)
     */
    static async findByTenant(knex, tenantId) {
        return this.queryForTenant(knex)
            .modify("notDeleted")
            .modify("active")
            .modify("byTenant", tenantId);
    }
    /**
     * Scope: Find active accounts (non-deleted)
     */
    static async findActive(knex) {
        return this.queryForTenant(knex).modify("notDeleted").modify("active");
    }
    /**
     * Scope: Search by term (only active, non-deleted accounts)
     */
    static async search(knex, term, tenantId) {
        return this.queryForTenant(knex)
            .modify("notDeleted")
            .modify("active")
            .modify("byTenant", tenantId)
            .modify("search", term);
    }
    /**
     * Update account balance
     * @param amount - Amount to add/subtract
     * @param isIncrease - true to increase balance, false to decrease
     * @returns New balance
     */
    updateBalance(amount, isIncrease) {
        return isIncrease
            ? this.currentBalance + amount
            : this.currentBalance - amount;
    }
}
exports.Account = Account;
