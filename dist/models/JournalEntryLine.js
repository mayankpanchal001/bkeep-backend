"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEntryLine = void 0;
const BaseModel_1 = require("./BaseModel");
const ChartOfAccount_1 = require("./ChartOfAccount");
/**
 * JournalEntryLine Model
 * Represents a single line in a journal entry (debit or credit)
 * Each journal entry must have at least 2 lines (one debit, one credit)
 */
class JournalEntryLine extends BaseModel_1.BaseModel {
    static get tableName() {
        return "journal_entry_lines";
    }
    // Relations
    account;
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: [
                "tenantId",
                "createdBy",
                "journalEntryId",
                "accountId",
                "lineNumber",
            ],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
                journalEntryId: { type: "string", format: "uuid" },
                accountId: { type: "string", format: "uuid" },
                lineNumber: { type: "integer", minimum: 1 },
                debit: { type: "number", minimum: 0, default: 0 },
                credit: { type: "number", minimum: 0, default: 0 },
                description: { type: ["string", "null"] },
                memo: { type: ["string", "null"] },
                contactId: { type: ["string", "null"], format: "uuid" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    // Relation mappings
    static get relationMappings() {
        return {
            account: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: ChartOfAccount_1.ChartOfAccount,
                join: {
                    from: "journal_entry_lines.account_id",
                    to: "chart_of_accounts.id",
                },
            },
        };
    }
    // Query modifiers
    static get modifiers() {
        return {
            ...super.modifiers,
            byTenant(query, tenantId) {
                query.where("tenant_id", tenantId);
            },
            byJournalEntry(query, journalEntryId) {
                query.where("journal_entry_id", journalEntryId);
            },
            byAccount(query, accountId) {
                query.where("account_id", accountId);
            },
            debits(query) {
                query.where("debit", ">", 0).where("credit", 0);
            },
            credits(query) {
                query.where("credit", ">", 0).where("debit", 0);
            },
        };
    }
    // Helper methods
    /**
     * Check if this line is a debit
     */
    isDebit() {
        return this.debit > 0 && this.credit === 0;
    }
    /**
     * Check if this line is a credit
     */
    isCredit() {
        return this.credit > 0 && this.debit === 0;
    }
    /**
     * Get the amount (debit or credit)
     */
    getAmount() {
        return this.debit > 0 ? this.debit : this.credit;
    }
    /**
     * Validate that line has either debit or credit (not both, not neither)
     */
    isValid() {
        const hasDebit = this.debit > 0;
        const hasCredit = this.credit > 0;
        // Must have exactly one (debit XOR credit)
        return hasDebit !== hasCredit;
    }
}
exports.JournalEntryLine = JournalEntryLine;
