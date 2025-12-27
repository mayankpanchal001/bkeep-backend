"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateJournalEntryController = exports.reverseJournalEntryController = exports.restoreJournalEntryById = exports.deleteJournalEntryById = exports.voidJournalEntryController = exports.postJournalEntryController = exports.updateJournalEntryController = exports.createJournalEntryController = exports.getJournalEntryById = exports.getAllJournalEntries = void 0;
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const journalEntry_queries_1 = require("../queries/journalEntry.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const date_1 = require("../utils/date");
/**
 * Get all journal entries controller
 * Retrieves journal entries with pagination, sorting, search, and filtering
 */
exports.getAllJournalEntries = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch entries
    const { entries, total } = await (0, journalEntry_queries_1.findJournalEntries)(tenantContext.tenantId, tenantContext.schemaName, filters);
    // Transform entries to response format (exclude internal fields)
    const entriesData = entries.map((entry) => ({
        id: entry.id,
        entryNumber: entry.entryNumber ?? null,
        entryDate: (0, date_1.formatDateToString)(entry.entryDate),
        entryType: entry.entryType,
        isAdjusting: entry.isAdjusting,
        isClosing: entry.isClosing,
        isReversing: entry.isReversing,
        description: entry.description ?? null,
        reference: entry.reference ?? null,
        status: entry.status,
        sourceModule: entry.sourceModule ?? null,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        postedAt: entry.postedAt ?? null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        lines: entry.lines?.map((line) => ({
            id: line.id,
            accountId: line.accountId,
            lineNumber: line.lineNumber,
            debit: line.debit,
            credit: line.credit,
            description: line.description ?? null,
            memo: line.memo ?? null,
        })) ?? [],
    }));
    // Get pagination metadata
    const pagination = (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total);
    // Prepare response data
    const responseData = {
        items: entriesData,
        pagination,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRIES_FETCHED, responseData));
});
/**
 * Get journal entry by ID controller
 */
exports.getJournalEntryById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch entry
    const entry = await (0, journalEntry_queries_1.findJournalEntryById)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform entry to response format
    const responseData = {
        id: entry.id,
        entryNumber: entry.entryNumber ?? null,
        entryDate: (0, date_1.formatDateToString)(entry.entryDate),
        entryType: entry.entryType,
        isAdjusting: entry.isAdjusting,
        isClosing: entry.isClosing,
        isReversing: entry.isReversing,
        reversalDate: (0, date_1.formatDateToString)(entry.reversalDate),
        description: entry.description ?? null,
        reference: entry.reference ?? null,
        memo: entry.memo ?? null,
        status: entry.status,
        sourceModule: entry.sourceModule ?? null,
        sourceId: entry.sourceId ?? null,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        approvedBy: entry.approvedBy ?? null,
        approvedAt: entry.approvedAt ?? null,
        postedBy: entry.postedBy ?? null,
        postedAt: entry.postedAt ?? null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        lines: entry.lines?.map((line) => ({
            id: line.id,
            accountId: line.accountId,
            account: line.account
                ? {
                    id: line.account.id,
                    accountNumber: line.account.accountNumber ?? null,
                    accountName: line.account.accountName,
                    accountType: line.account.accountType,
                }
                : null,
            lineNumber: line.lineNumber,
            debit: line.debit,
            credit: line.credit,
            description: line.description ?? null,
            memo: line.memo ?? null,
        })) ?? [],
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_FETCHED, responseData));
});
/**
 * Create journal entry controller
 */
exports.createJournalEntryController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated body
    const entryData = req.validatedData;
    // Create entry
    const entry = await (0, journalEntry_queries_1.createJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, user.id, entryData);
    // Transform entry to response format
    const responseData = {
        id: entry.id,
        entryNumber: entry.entryNumber ?? null,
        entryDate: (0, date_1.formatDateToString)(entry.entryDate),
        entryType: entry.entryType,
        status: entry.status,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        memo: entry.memo ?? null,
        createdAt: entry.createdAt,
        lines: entry.lines?.map((line) => ({
            id: line.id,
            accountId: line.accountId,
            lineNumber: line.lineNumber,
            debit: line.debit,
            credit: line.credit,
        })) ?? [],
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_CREATED, responseData));
});
/**
 * Update journal entry controller
 */
exports.updateJournalEntryController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params and body
    const { id } = req.params;
    const updateData = req.validatedData;
    // Update entry
    const updatedEntry = await (0, journalEntry_queries_1.updateJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, id, updateData);
    // Transform entry to response format
    const responseData = {
        id: updatedEntry.id,
        entryNumber: updatedEntry.entryNumber ?? null,
        entryDate: (0, date_1.formatDateToString)(updatedEntry.entryDate),
        entryType: updatedEntry.entryType,
        status: updatedEntry.status,
        updatedAt: updatedEntry.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_UPDATED, responseData));
});
/**
 * Post journal entry controller
 * Posts a draft journal entry and updates COA balances
 */
exports.postJournalEntryController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated params and body
    const { id } = req.params;
    const postData = req.body;
    // Post entry
    const postedEntry = await (0, journalEntry_queries_1.postJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, id, user.id, postData?.approvedBy);
    // Transform entry to response format
    const responseData = {
        id: postedEntry.id,
        entryNumber: postedEntry.entryNumber ?? null,
        status: postedEntry.status,
        postedBy: postedEntry.postedBy ?? null,
        postedAt: postedEntry.postedAt ?? null,
        totalDebit: postedEntry.totalDebit,
        totalCredit: postedEntry.totalCredit,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_POSTED, responseData));
});
/**
 * Void journal entry controller
 */
exports.voidJournalEntryController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Void entry
    const voidedEntry = await (0, journalEntry_queries_1.voidJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform entry to response format
    const responseData = {
        id: voidedEntry.id,
        entryNumber: voidedEntry.entryNumber ?? null,
        status: voidedEntry.status,
        updatedAt: voidedEntry.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_VOIDED, responseData));
});
/**
 * Delete journal entry controller
 * Soft deletes a journal entry (only if draft)
 */
exports.deleteJournalEntryById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Delete entry
    const deletedEntry = await (0, journalEntry_queries_1.deleteJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform entry to response format
    const responseData = {
        id: deletedEntry.id,
        entryNumber: deletedEntry.entryNumber ?? null,
        deletedAt: deletedEntry.deletedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_DELETED, responseData));
});
/**
 * Restore journal entry controller
 * Restores a soft-deleted journal entry
 */
exports.restoreJournalEntryById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Restore entry
    const restoredEntry = await (0, journalEntry_queries_1.restoreJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform entry to response format
    const responseData = {
        id: restoredEntry.id,
        entryNumber: restoredEntry.entryNumber ?? null,
        status: restoredEntry.status,
        createdAt: restoredEntry.createdAt,
        updatedAt: restoredEntry.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_RESTORED, responseData));
});
/**
 * Reverse journal entry controller
 * Creates a reversing entry for a posted journal entry
 */
exports.reverseJournalEntryController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated params and body
    const { id } = req.params;
    const reverseData = req.validatedData;
    // Parse reversal date - if string, use date string parser; if Date, use UTC parser
    const reversalDate = typeof reverseData.reversalDate === "string"
        ? (0, date_1.parseDateStringToUTC)(reverseData.reversalDate)
        : (0, date_1.parseToUTCDate)(reverseData.reversalDate);
    // Reverse entry
    const reversedEntry = await (0, journalEntry_queries_1.reverseJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, id, reversalDate, user.id);
    // Transform entry to response format
    const responseData = {
        id: reversedEntry.id,
        entryNumber: reversedEntry.entryNumber ?? null,
        entryDate: (0, date_1.formatDateToString)(reversedEntry.entryDate),
        entryType: reversedEntry.entryType,
        isReversing: reversedEntry.isReversing,
        reversalDate: (0, date_1.formatDateToString)(reversedEntry.reversalDate),
        description: reversedEntry.description ?? null,
        reference: reversedEntry.reference ?? null,
        status: reversedEntry.status,
        sourceModule: reversedEntry.sourceModule ?? null,
        sourceId: reversedEntry.sourceId ?? null,
        totalDebit: reversedEntry.totalDebit,
        totalCredit: reversedEntry.totalCredit,
        postedAt: reversedEntry.postedAt ?? null,
        createdAt: reversedEntry.createdAt,
        lines: reversedEntry.lines?.map((line) => ({
            id: line.id,
            accountId: line.accountId,
            lineNumber: line.lineNumber,
            debit: line.debit,
            credit: line.credit,
            description: line.description ?? null,
        })) ?? [],
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_REVERSED, responseData));
});
/**
 * Duplicate journal entry controller
 * Creates a new journal entry by duplicating an existing entry
 */
exports.duplicateJournalEntryController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated params and body
    const { id } = req.params;
    const duplicateData = req.validatedData;
    // Duplicate entry
    const duplicatedEntry = await (0, journalEntry_queries_1.duplicateJournalEntry)(tenantContext.tenantId, tenantContext.schemaName, id, user.id, duplicateData);
    // Transform entry to response format
    const responseData = {
        id: duplicatedEntry.id,
        entryNumber: duplicatedEntry.entryNumber ?? null,
        entryDate: (0, date_1.formatDateToString)(duplicatedEntry.entryDate),
        entryType: duplicatedEntry.entryType,
        isAdjusting: duplicatedEntry.isAdjusting,
        isClosing: duplicatedEntry.isClosing,
        description: duplicatedEntry.description ?? null,
        reference: duplicatedEntry.reference ?? null,
        memo: duplicatedEntry.memo ?? null,
        status: duplicatedEntry.status,
        sourceModule: duplicatedEntry.sourceModule ?? null,
        sourceId: duplicatedEntry.sourceId ?? null,
        totalDebit: duplicatedEntry.totalDebit,
        totalCredit: duplicatedEntry.totalCredit,
        createdAt: duplicatedEntry.createdAt,
        lines: duplicatedEntry.lines?.map((line) => ({
            id: line.id,
            accountId: line.accountId,
            lineNumber: line.lineNumber,
            debit: line.debit,
            credit: line.credit,
            description: line.description ?? null,
            memo: line.memo ?? null,
        })) ?? [],
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.JOURNAL_ENTRY_DUPLICATED, responseData));
});
