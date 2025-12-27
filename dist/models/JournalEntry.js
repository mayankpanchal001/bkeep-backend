"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEntry = exports.JournalEntryStatus = exports.JournalEntryType = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const BaseModel_1 = require("./BaseModel");
const JournalEntryLine_1 = require("./JournalEntryLine");
const ApiError_1 = require("../utils/ApiError");
var JournalEntryType;
(function (JournalEntryType) {
    JournalEntryType["STANDARD"] = "standard";
    JournalEntryType["ADJUSTING"] = "adjusting";
    JournalEntryType["CLOSING"] = "closing";
    JournalEntryType["REVERSING"] = "reversing";
})(JournalEntryType || (exports.JournalEntryType = JournalEntryType = {}));
var JournalEntryStatus;
(function (JournalEntryStatus) {
    JournalEntryStatus["DRAFT"] = "draft";
    JournalEntryStatus["POSTED"] = "posted";
    JournalEntryStatus["VOIDED"] = "voided";
})(JournalEntryStatus || (exports.JournalEntryStatus = JournalEntryStatus = {}));
/**
 * JournalEntry Model
 * Represents a journal entry (double-entry bookkeeping)
 * Foundation for proper accounting and general ledger tracking
 */
class JournalEntry extends BaseModel_1.BaseModel {
    static get tableName() {
        return "journal_entries";
    }
    // Relations
    lines;
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: ["tenantId", "createdBy", "entryDate"],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
                entryNumber: { type: ["string", "null"], maxLength: 100 },
                entryDate: { type: "string", format: "date-time" },
                entryType: {
                    type: "string",
                    enum: ["standard", "adjusting", "closing", "reversing"],
                    default: "standard",
                },
                isAdjusting: { type: "boolean", default: false },
                isClosing: { type: "boolean", default: false },
                isReversing: { type: "boolean", default: false },
                reversalDate: { type: ["string", "null"], format: "date-time" },
                description: { type: ["string", "null"] },
                reference: { type: ["string", "null"], maxLength: 255 },
                memo: { type: ["string", "null"] },
                status: {
                    type: "string",
                    enum: ["draft", "posted", "voided"],
                    default: "draft",
                },
                sourceModule: { type: ["string", "null"], maxLength: 100 },
                sourceId: { type: ["string", "null"], format: "uuid" },
                totalDebit: { type: "number", minimum: 0, default: 0 },
                totalCredit: { type: "number", minimum: 0, default: 0 },
                approvedBy: { type: ["string", "null"], format: "uuid" },
                approvedAt: { type: ["string", "null"], format: "date-time" },
                postedBy: { type: ["string", "null"], format: "uuid" },
                postedAt: { type: ["string", "null"], format: "date-time" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    // Relation mappings
    static get relationMappings() {
        return {
            lines: {
                relation: BaseModel_1.BaseModel.HasManyRelation,
                modelClass: JournalEntryLine_1.JournalEntryLine,
                join: {
                    from: "journal_entries.id",
                    to: "journal_entry_lines.journal_entry_id",
                },
                filter: (query) => {
                    query.modify("notDeleted");
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
            byStatus(query, status) {
                query.where("status", status);
            },
            draft(query) {
                query.where("status", JournalEntryStatus.DRAFT);
            },
            posted(query) {
                query.where("status", JournalEntryStatus.POSTED);
            },
            voided(query) {
                query.where("status", JournalEntryStatus.VOIDED);
            },
            byDateRange(query, startDate, endDate) {
                query.whereBetween("entry_date", [startDate, endDate]);
            },
            byType(query, entryType) {
                query.where("entry_type", entryType);
            },
            withLines(query) {
                query.withGraphFetched("lines.account");
            },
        };
    }
    // Helper methods
    /**
     * Check if journal entry is in draft status
     */
    isDraft() {
        return this.status === JournalEntryStatus.DRAFT;
    }
    /**
     * Check if journal entry is posted
     */
    isPosted() {
        return this.status === JournalEntryStatus.POSTED;
    }
    /**
     * Check if journal entry is voided
     */
    isVoided() {
        return this.status === JournalEntryStatus.VOIDED;
    }
    /**
     * Validate that debits equal credits
     */
    isBalanced() {
        if (!this.lines || this.lines.length === 0) {
            return false;
        }
        const debitTotal = this.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
        const creditTotal = this.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
        // Allow for small floating point differences
        return Math.abs(debitTotal - creditTotal) < 0.0005;
    }
    /**
     * Validate journal entry before posting
     * Throws ApiError if validation fails
     */
    validate() {
        if (!this.lines || this.lines.length < 2) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_INSUFFICIENT_LINES);
        }
        // Validate each line
        for (const line of this.lines) {
            if (!line.isValid()) {
                throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_LINE_INVALID);
            }
        }
        // Recalculate totals from lines
        this.calculateTotals();
        // Validate balance
        if (!this.isBalanced()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_BALANCED);
        }
    }
    /**
     * Calculate totals from lines and update model
     */
    calculateTotals() {
        if (!this.lines || this.lines.length === 0) {
            this.totalDebit = 0;
            this.totalCredit = 0;
            return;
        }
        this.totalDebit = this.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
        this.totalCredit = this.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    }
}
exports.JournalEntry = JournalEntry;
