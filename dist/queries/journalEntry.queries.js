"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateJournalEntry = exports.reverseJournalEntry = exports.restoreJournalEntry = exports.deleteJournalEntry = exports.voidJournalEntry = exports.postJournalEntry = exports.updateJournalEntry = exports.createJournalEntry = exports.findJournalEntryById = exports.findJournalEntries = exports.generateEntryNumber = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const AccountBalanceHistory_1 = require("../models/AccountBalanceHistory");
const ChartOfAccount_1 = require("../models/ChartOfAccount");
const JournalEntry_1 = require("../models/JournalEntry");
const JournalEntryLine_1 = require("../models/JournalEntryLine");
const accountBalanceHistory_queries_1 = require("./accountBalanceHistory.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
const tenantQuery_1 = require("../utils/tenantQuery");
/**
 * Generate next journal entry number
 * Format: JE-YYYY-XXX (e.g., JE-2024-001)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
const generateEntryNumber = async (tenantId, schemaName, trx) => {
    const execute = async (transaction) => {
        const year = new Date().getFullYear();
        const prefix = `JE-${year}-`;
        // Find highest entry number for this year
        const highest = await JournalEntry_1.JournalEntry.query(transaction)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .where("entry_number", "like", `${prefix}%`)
            .orderByRaw("CAST(SUBSTRING(entry_number FROM LENGTH(?) + 1) AS INTEGER) DESC", [prefix])
            .first();
        if (!highest?.entryNumber) {
            return `${prefix}001`;
        }
        // Extract number part and increment
        const numberPart = highest.entryNumber.replace(prefix, "");
        const nextNumber = Number.parseInt(numberPart, 10) + 1;
        return `${prefix}${String(nextNumber).padStart(3, "0")}`;
    };
    // If transaction is provided, use it directly
    if (trx) {
        return execute(trx);
    }
    // Otherwise, create a new transaction
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.generateEntryNumber = generateEntryNumber;
/**
 * Map sort field to database column
 */
const mapJournalEntrySortField = (field) => {
    // Use switch statement to avoid object injection
    switch (field) {
        case "entryNumber":
            return "entry_number";
        case "entryDate":
            return "entry_date";
        case "entryType":
            return "entry_type";
        case "status":
            return "status";
        case "totalDebit":
            return "total_debit";
        case "totalCredit":
            return "total_credit";
        case "createdAt":
            return "created_at";
        case "updatedAt":
            return "updated_at";
        default:
            return "entry_date";
    }
};
/**
 * Find journal entries with pagination, sorting, search, and filtering
 */
const findJournalEntries = async (tenantId, schemaName, filters) => {
    const { page = 1, limit = 50, sort = "entryDate", order = "desc", search, status, entryType, startDate, endDate, sourceModule, } = filters;
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        let query = JournalEntry_1.JournalEntry.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId);
        // Apply filters
        if (status) {
            query = query.modify("byStatus", status);
        }
        if (entryType) {
            query = query.modify("byType", entryType);
        }
        if (startDate && endDate) {
            query = query.modify("byDateRange", (0, date_1.parseDateStringToUTC)(startDate), (0, date_1.parseDateStringToUTC)(endDate));
        }
        else if (startDate) {
            query = query.where("entry_date", ">=", (0, date_1.parseDateStringToUTC)(startDate));
        }
        else if (endDate) {
            const endDateObj = (0, date_1.parseDateStringToUTC)(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            query = query.where("entry_date", "<=", endDateObj);
        }
        if (sourceModule) {
            query = query.where("source_module", sourceModule);
        }
        if (search) {
            query = query.where((builder) => {
                builder
                    .where("entry_number", "ilike", `%${search}%`)
                    .orWhere("description", "ilike", `%${search}%`)
                    .orWhere("reference", "ilike", `%${search}%`);
            });
        }
        // Get total count
        const total = await query.resultSize();
        // Apply sorting
        const sortField = mapJournalEntrySortField(sort);
        const sortOrder = order === "desc" ? "desc" : "asc";
        // Apply pagination
        const offset = (0, shared_schema_1.calculateOffset)(page, limit);
        const entries = await query
            .orderBy(sortField, sortOrder)
            .limit(limit)
            .offset(offset)
            .modify("withLines");
        return { entries, total };
    });
};
exports.findJournalEntries = findJournalEntries;
/**
 * Find journal entry by ID
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param entryId - Entry ID
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
const findJournalEntryById = async (tenantId, schemaName, entryId, trx) => {
    const execute = async (transaction) => {
        const entry = await JournalEntry_1.JournalEntry.query(transaction)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("withLines")
            .findById(entryId);
        if (!entry) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND);
        }
        return entry;
    };
    // If transaction is provided, use it directly
    if (trx) {
        return execute(trx);
    }
    // Otherwise, create a new transaction
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.findJournalEntryById = findJournalEntryById;
/**
 * Create journal entry with lines
 */
const createJournalEntry = async (tenantId, schemaName, createdBy, data) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Generate entry number if not provided
        let entryNumber = data.entryNumber;
        if (!entryNumber) {
            entryNumber = await (0, exports.generateEntryNumber)(tenantId, schemaName, trx);
        }
        else {
            // Check if entry number already exists
            const existing = await JournalEntry_1.JournalEntry.query(trx)
                .modify("notDeleted")
                .modify("byTenant", tenantId)
                .where("entry_number", entryNumber)
                .first();
            if (existing) {
                throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NUMBER_EXISTS);
            }
        }
        // Validate all accounts exist
        for (const line of data.lines) {
            const account = await ChartOfAccount_1.ChartOfAccount.query(trx)
                .modify("notDeleted")
                .modify("byTenant", tenantId)
                .findById(line.accountId);
            if (!account) {
                throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND);
            }
        }
        // Calculate totals
        const totalDebit = data.lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
        const totalCredit = data.lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);
        // Validate balance
        if (Math.abs(totalDebit - totalCredit) >= 0.01) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_BALANCED);
        }
        // Create journal entry
        const entryDateObj = (0, date_1.parseDateStringToUTC)(data.entryDate);
        const reversalDateObj = data.reversalDate
            ? (0, date_1.parseDateStringToUTC)(data.reversalDate)
            : null;
        const entryData = {
            entryNumber,
            entryDate: entryDateObj,
            entryType: data.entryType ?? JournalEntry_1.JournalEntryType.STANDARD,
            isAdjusting: data.isAdjusting ?? false,
            isClosing: data.isClosing ?? false,
            isReversing: data.isReversing ?? false,
            reversalDate: reversalDateObj,
            description: data.description ?? null,
            reference: data.reference ?? null,
            memo: data.memo ?? null,
            status: JournalEntry_1.JournalEntryStatus.DRAFT,
            sourceModule: data.sourceModule ?? null,
            sourceId: data.sourceId ?? null,
            totalDebit,
            totalCredit,
        };
        const insertData = {
            ...entryData,
            entryDate: entryDateObj.toISOString(),
            reversalDate: reversalDateObj
                ? reversalDateObj.toISOString()
                : null,
            tenantId,
            createdBy,
        };
        const entry = await JournalEntry_1.JournalEntry.query(trx).insert(insertData);
        // Create lines
        const lineData = data.lines.map((line, index) => ({
            accountId: line.accountId,
            lineNumber: line.lineNumber ?? index + 1,
            debit: Number(line.debit ?? 0),
            credit: Number(line.credit ?? 0),
            description: line.description ?? null,
            memo: line.memo ?? null,
            contactId: line.contactId ?? null,
        }));
        await JournalEntryLine_1.JournalEntryLine.query(trx).insert(lineData.map((line) => ({
            ...line,
            journalEntryId: entry.id,
            tenantId,
            createdBy,
        })));
        // Reload with lines
        const entryWithLines = await JournalEntry_1.JournalEntry.query(trx)
            .modify("withLines")
            .findById(entry.id);
        if (!entryWithLines) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND);
        }
        return entryWithLines;
    });
};
exports.createJournalEntry = createJournalEntry;
/**
 * Update journal entry (only if draft)
 */
const updateJournalEntry = async (tenantId, schemaName, entryId, data) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const entry = await (0, exports.findJournalEntryById)(tenantId, schemaName, entryId, trx);
        // Cannot modify posted or voided entries
        if (entry.isPosted() || entry.isVoided()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_MODIFY_POSTED);
        }
        // Check entry number uniqueness if being changed
        if (data.entryNumber && data.entryNumber !== entry.entryNumber) {
            const existing = await JournalEntry_1.JournalEntry.query(trx)
                .modify("notDeleted")
                .modify("byTenant", tenantId)
                .where("entry_number", data.entryNumber)
                .whereNot("id", entryId)
                .first();
            if (existing) {
                throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NUMBER_EXISTS);
            }
        }
        // Update entry
        const updateData = {};
        if (data.entryNumber !== undefined)
            updateData.entryNumber = data.entryNumber;
        if (data.entryDate) {
            const entryDateObj = (0, date_1.parseDateStringToUTC)(data.entryDate);
            updateData.entryDate = entryDateObj.toISOString();
        }
        if (data.entryType)
            updateData.entryType = data.entryType;
        if (data.isAdjusting !== undefined)
            updateData.isAdjusting = data.isAdjusting;
        if (data.isClosing !== undefined)
            updateData.isClosing = data.isClosing;
        if (data.isReversing !== undefined)
            updateData.isReversing = data.isReversing;
        if (data.reversalDate !== undefined) {
            const reversalDateObj = data.reversalDate
                ? (0, date_1.parseDateStringToUTC)(data.reversalDate)
                : null;
            updateData.reversalDate = reversalDateObj
                ? reversalDateObj.toISOString()
                : null;
        }
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.reference !== undefined)
            updateData.reference = data.reference;
        if (data.memo !== undefined)
            updateData.memo = data.memo;
        if (data.sourceModule !== undefined)
            updateData.sourceModule = data.sourceModule;
        if (data.sourceId !== undefined)
            updateData.sourceId = data.sourceId;
        const updated = await entry.$query(trx).patchAndFetch(updateData);
        // Reload with lines
        return (0, exports.findJournalEntryById)(tenantId, schemaName, updated.id, trx);
    });
};
exports.updateJournalEntry = updateJournalEntry;
/**
 * Post journal entry (update COA balances)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param entryId - Entry ID
 * @param postedBy - User ID who posted the entry
 * @param approvedBy - Optional user ID who approved the entry
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
const postJournalEntry = async (tenantId, schemaName, entryId, postedBy, approvedBy, trx) => {
    const execute = async (transaction) => {
        const entry = await (0, exports.findJournalEntryById)(tenantId, schemaName, entryId, transaction);
        // Cannot post if already posted
        if (entry.isPosted()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_ALREADY_POSTED);
        }
        // Cannot post if voided
        if (entry.isVoided()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_POST_DRAFT);
        }
        // Validate entry
        entry.validate();
        // Update COA balances for each line
        if (entry.lines) {
            const lines = entry.lines;
            for (const line of lines) {
                const account = await ChartOfAccount_1.ChartOfAccount.query(transaction)
                    .modify("notDeleted")
                    .modify("byTenant", tenantId)
                    .findById(line.accountId);
                if (!account) {
                    throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND);
                }
                // Update balance based on debit/credit
                const isDebit = line.debit > 0;
                const amount = isDebit ? line.debit : line.credit;
                const previousBalance = account.currentBalance;
                const newBalance = account.updateBalance(amount, isDebit);
                // Update account balance
                await account.$query(transaction).patchAndFetch({
                    currentBalance: newBalance,
                });
                // Create balance history record
                await (0, accountBalanceHistory_queries_1.createBalanceHistory)(tenantId, schemaName, {
                    accountId: account.id,
                    journalEntryId: entry.id,
                    journalEntryLineId: line.id,
                    previousBalance,
                    newBalance,
                    changeAmount: amount,
                    changeType: isDebit
                        ? AccountBalanceHistory_1.BalanceChangeType.DEBIT
                        : AccountBalanceHistory_1.BalanceChangeType.CREDIT,
                    changeDate: entry.entryDate,
                    description: line.description
                        ? `${entry.entryNumber ?? "JE"}: ${line.description}`
                        : `Journal Entry ${entry.entryNumber ?? entry.id}`,
                    sourceModule: "journal_entries",
                    sourceId: entry.id,
                    createdBy: postedBy,
                }, transaction);
            }
        }
        // Update entry status
        const now = (0, date_1.getCurrentDate)();
        const updateData = {
            status: JournalEntry_1.JournalEntryStatus.POSTED,
            postedBy,
            postedAt: (0, date_1.formatDateToISOString)(now),
        };
        if (approvedBy) {
            updateData.approvedBy = approvedBy;
            updateData.approvedAt = (0, date_1.formatDateToISOString)(now);
        }
        else if (entry.approvedBy) {
            updateData.approvedBy = entry.approvedBy;
            updateData.approvedAt = (0, date_1.formatDateToISOString)(entry.approvedAt);
        }
        const updated = await entry.$query(transaction).patchAndFetch(updateData);
        // Reload with lines
        return (0, exports.findJournalEntryById)(tenantId, schemaName, updated.id, transaction);
    };
    // If transaction is provided, use it directly
    if (trx) {
        return execute(trx);
    }
    // Otherwise, create a new transaction
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.postJournalEntry = postJournalEntry;
/**
 * Void journal entry (only if draft)
 */
const voidJournalEntry = async (tenantId, schemaName, entryId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const entry = await (0, exports.findJournalEntryById)(tenantId, schemaName, entryId, trx);
        // Cannot void if already voided
        if (entry.isVoided()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_ALREADY_VOIDED);
        }
        // Cannot void if posted (must reverse instead)
        if (entry.isPosted()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_VOID_POSTED);
        }
        // Update status
        const updated = await entry.$query(trx).patchAndFetch({
            status: JournalEntry_1.JournalEntryStatus.VOIDED,
        });
        // Reload with lines
        return (0, exports.findJournalEntryById)(tenantId, schemaName, updated.id, trx);
    });
};
exports.voidJournalEntry = voidJournalEntry;
/**
 * Delete journal entry (soft delete, only if draft)
 */
const deleteJournalEntry = async (tenantId, schemaName, entryId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const entry = await (0, exports.findJournalEntryById)(tenantId, schemaName, entryId, trx);
        // Cannot delete if posted
        if (entry.isPosted()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_DELETE_POSTED);
        }
        // Soft delete using direct Knex update
        await trx("journal_entries")
            .where("id", entryId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: (0, date_1.getCurrentDate)(),
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload (without notDeleted modifier)
        const deleted = await JournalEntry_1.JournalEntry.query(trx)
            .modify("byTenant", tenantId)
            .findById(entryId);
        if (!deleted) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND);
        }
        return deleted;
    });
};
exports.deleteJournalEntry = deleteJournalEntry;
/**
 * Restore journal entry (un-soft delete)
 */
const restoreJournalEntry = async (tenantId, schemaName, entryId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const entry = await JournalEntry_1.JournalEntry.query(trx)
            .modify("deleted")
            .modify("byTenant", tenantId)
            .findById(entryId);
        if (!entry) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND_OR_NOT_DELETED);
        }
        // Restore
        await trx("journal_entries")
            .where("id", entryId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: null,
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload
        const restored = await JournalEntry_1.JournalEntry.query(trx)
            .modify("byTenant", tenantId)
            .findById(entryId);
        if (!restored) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND);
        }
        return restored;
    });
};
exports.restoreJournalEntry = restoreJournalEntry;
/**
 * Reverse a posted journal entry
 * Creates a new reversing entry with debits/credits swapped and updates COA balances
 */
const reverseJournalEntry = async (tenantId, schemaName, entryId, reversalDate, createdBy) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Get the original entry
        const originalEntry = await (0, exports.findJournalEntryById)(tenantId, schemaName, entryId, trx);
        // Cannot reverse if voided (check this first since voided entries are also not posted)
        if (originalEntry.isVoided()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_REVERSE_VOIDED);
        }
        // Cannot reverse if not posted (draft entries)
        if (!originalEntry.isPosted()) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_CANNOT_REVERSE_DRAFT);
        }
        // Check if already reversed (has a reversing entry)
        const existingReversal = await JournalEntry_1.JournalEntry.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .where("source_module", "journal_entries")
            .where("source_id", entryId)
            .where("is_reversing", true)
            .first();
        if (existingReversal) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_ALREADY_REVERSED);
        }
        // Use originalEntry which already has lines loaded (from findJournalEntryById with withLines modifier)
        // No need to reload - originalEntry was already fetched with proper security filters
        if (!originalEntry.lines || originalEntry.lines.length === 0) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NOT_FOUND);
        }
        // Generate reversing entry number
        const reversingEntryNumber = await (0, exports.generateEntryNumber)(tenantId, schemaName, trx);
        // Create reversing entry with swapped debits/credits
        const reversingLines = originalEntry.lines.map((line) => ({
            accountId: line.accountId,
            lineNumber: line.lineNumber,
            // Swap debit and credit
            debit: Number(line.credit || 0),
            credit: Number(line.debit || 0),
            description: line.description
                ? `Reversal: ${line.description}`
                : `Reversal of entry ${originalEntry.entryNumber ?? entryId}`,
            memo: line.memo ? `Reversal: ${line.memo}` : null,
            contactId: line.contactId ?? null,
        }));
        // Calculate totals (swapped)
        const totalDebit = reversingLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
        const totalCredit = reversingLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
        // Create reversing entry
        const reversingEntryData = {
            entryNumber: reversingEntryNumber,
            entryDate: reversalDate,
            entryType: JournalEntry_1.JournalEntryType.REVERSING,
            isAdjusting: false,
            isClosing: false,
            isReversing: true,
            reversalDate: reversalDate,
            description: `Reversal of journal entry ${originalEntry.entryNumber ?? entryId}`,
            reference: originalEntry.reference
                ? `Reversal: ${originalEntry.reference}`
                : null,
            status: JournalEntry_1.JournalEntryStatus.DRAFT, // Start as draft, will be posted
            sourceModule: "journal_entries",
            sourceId: entryId,
            totalDebit,
            totalCredit,
        };
        const insertData = {
            ...reversingEntryData,
            entryDate: (0, date_1.formatDateToISOString)(reversalDate),
            reversalDate: (0, date_1.formatDateToISOString)(reversalDate),
            tenantId,
            createdBy,
        };
        const reversingEntry = await JournalEntry_1.JournalEntry.query(trx).insert(insertData);
        // Create reversing lines
        await JournalEntryLine_1.JournalEntryLine.query(trx).insert(reversingLines.map((line) => ({
            ...line,
            journalEntryId: reversingEntry.id,
            tenantId,
            createdBy,
        })));
        // Post the reversing entry (this will reverse the COA balances)
        const postedReversal = await (0, exports.postJournalEntry)(tenantId, schemaName, reversingEntry.id, createdBy, undefined, trx);
        // Mark original entry as reversed (set reversalDate to indicate it has been reversed)
        // Note: isReversing should remain false on the original entry - it only applies to the reversing entry itself
        await originalEntry.$query(trx).patchAndFetch({
            reversalDate: (0, date_1.formatDateToISOString)(reversalDate),
        });
        // Reload reversing entry with lines
        return (0, exports.findJournalEntryById)(tenantId, schemaName, postedReversal.id, trx);
    });
};
exports.reverseJournalEntry = reverseJournalEntry;
/**
 * Duplicate journal entry
 * Creates a new journal entry with copied data from an existing entry
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param entryId - Entry ID to duplicate
 * @param createdBy - User ID creating the duplicate
 * @param duplicateData - Optional data to override (entryDate, entryNumber)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
const duplicateJournalEntry = async (tenantId, schemaName, entryId, createdBy, duplicateData, trx) => {
    const execute = async (transaction) => {
        // Get original entry with lines
        const original = await (0, exports.findJournalEntryById)(tenantId, schemaName, entryId, transaction);
        if (!original.lines || original.lines.length === 0) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_INSUFFICIENT_LINES);
        }
        // Determine entry date (use provided date, or original date, or today)
        const entryDate = duplicateData?.entryDate
            ? typeof duplicateData.entryDate === "string"
                ? (0, date_1.parseDateStringToUTC)(duplicateData.entryDate)
                : (0, date_1.parseToUTCDate)(duplicateData.entryDate)
            : original.entryDate;
        // Generate entry number if not provided
        let entryNumber = duplicateData?.entryNumber;
        if (!entryNumber) {
            entryNumber = await (0, exports.generateEntryNumber)(tenantId, schemaName, transaction);
        }
        else {
            // Check if entry number already exists
            const existing = await JournalEntry_1.JournalEntry.query(transaction)
                .modify("notDeleted")
                .modify("byTenant", tenantId)
                .where("entry_number", entryNumber)
                .first();
            if (existing) {
                throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.JOURNAL_ENTRY_NUMBER_EXISTS);
            }
        }
        // Create new entry with copied data
        const entryData = {
            entryNumber,
            entryDate,
            entryType: original.entryType,
            isAdjusting: original.isAdjusting,
            isClosing: original.isClosing,
            isReversing: false, // Duplicated entries are not reversing entries
            reversalDate: null, // Reset reversal date
            description: original.description ?? null,
            reference: original.reference ?? null,
            memo: original.memo ?? null,
            status: JournalEntry_1.JournalEntryStatus.DRAFT, // Always start as draft
            sourceModule: "journal_entries", // Mark as duplicated from journal entry
            sourceId: original.id, // Reference to original entry
            totalDebit: Number(original.totalDebit ?? 0),
            totalCredit: Number(original.totalCredit ?? 0),
        };
        const insertData = {
            ...entryData,
            entryDate: entryDate.toISOString(),
            tenantId,
            createdBy,
        };
        const newEntry = await JournalEntry_1.JournalEntry.query(transaction).insert(insertData);
        // Create lines with copied data
        const lineData = original.lines.map((line) => ({
            accountId: line.accountId,
            lineNumber: line.lineNumber,
            debit: Number(line.debit ?? 0),
            credit: Number(line.credit ?? 0),
            description: line.description ?? null,
            memo: line.memo ?? null,
            contactId: line.contactId ?? null,
        }));
        await JournalEntryLine_1.JournalEntryLine.query(transaction).insert(lineData.map((line) => ({
            ...line,
            journalEntryId: newEntry.id,
            tenantId,
            createdBy,
        })));
        // Reload with lines
        return (0, exports.findJournalEntryById)(tenantId, schemaName, newEntry.id, transaction);
    };
    // If transaction is provided, use it directly
    if (trx) {
        return execute(trx);
    }
    // Otherwise, create a new transaction
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.duplicateJournalEntry = duplicateJournalEntry;
