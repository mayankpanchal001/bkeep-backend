"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountBalanceHistory = exports.BalanceChangeType = void 0;
const BaseModel_1 = require("./BaseModel");
const ChartOfAccount_1 = require("./ChartOfAccount");
const JournalEntry_1 = require("./JournalEntry");
const JournalEntryLine_1 = require("./JournalEntryLine");
var BalanceChangeType;
(function (BalanceChangeType) {
    BalanceChangeType["DEBIT"] = "debit";
    BalanceChangeType["CREDIT"] = "credit";
})(BalanceChangeType || (exports.BalanceChangeType = BalanceChangeType = {}));
/**
 * AccountBalanceHistory Model
 * Tracks all balance changes to Chart of Accounts over time
 * Provides complete audit trail for balance updates
 */
class AccountBalanceHistory extends BaseModel_1.BaseModel {
    static get tableName() {
        return "account_balance_history";
    }
    // Relations
    account;
    journalEntry;
    journalEntryLine;
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: [
                "tenantId",
                "accountId",
                "previousBalance",
                "newBalance",
                "changeAmount",
                "changeType",
                "changeDate",
                "createdBy",
            ],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                accountId: { type: "string", format: "uuid" },
                journalEntryId: { type: ["string", "null"], format: "uuid" },
                journalEntryLineId: { type: ["string", "null"], format: "uuid" },
                previousBalance: { type: "number" },
                newBalance: { type: "number" },
                changeAmount: { type: "number", minimum: 0 },
                changeType: { type: "string", enum: ["debit", "credit"] },
                changeDate: { type: "string", format: "date-time" },
                description: { type: ["string", "null"] },
                sourceModule: { type: ["string", "null"], maxLength: 100 },
                sourceId: { type: ["string", "null"], format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
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
                    from: "account_balance_history.account_id",
                    to: "chart_of_accounts.id",
                },
            },
            journalEntry: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: JournalEntry_1.JournalEntry,
                join: {
                    from: "account_balance_history.journal_entry_id",
                    to: "journal_entries.id",
                },
            },
            journalEntryLine: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: JournalEntryLine_1.JournalEntryLine,
                join: {
                    from: "account_balance_history.journal_entry_line_id",
                    to: "journal_entry_lines.id",
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
            byAccount(query, accountId) {
                query.where("account_id", accountId);
            },
            byJournalEntry(query, journalEntryId) {
                query.where("journal_entry_id", journalEntryId);
            },
            byDateRange(query, startDate, endDate) {
                query.whereBetween("change_date", [startDate, endDate]);
            },
            byChangeType(query, changeType) {
                query.where("change_type", changeType);
            },
            withRelations(query) {
                query.withGraphFetched("[account, journalEntry, journalEntryLine]");
            },
            recentFirst(query) {
                query.orderBy("change_date", "desc").orderBy("created_at", "desc");
            },
        };
    }
    // Helper methods
    isDebit() {
        return this.changeType === BalanceChangeType.DEBIT;
    }
    isCredit() {
        return this.changeType === BalanceChangeType.CREDIT;
    }
    /**
     * Get the net change (positive for increase, negative for decrease)
     */
    getNetChange() {
        return this.newBalance - this.previousBalance;
    }
}
exports.AccountBalanceHistory = AccountBalanceHistory;
