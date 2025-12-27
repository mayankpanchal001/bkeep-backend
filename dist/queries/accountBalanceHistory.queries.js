"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountBalanceAsOf = exports.findBalanceHistoryByJournalEntry = exports.findBalanceHistoryByAccount = exports.findBalanceHistory = exports.createBalanceHistory = void 0;
const AccountBalanceHistory_1 = require("../models/AccountBalanceHistory");
const date_1 = require("../utils/date");
const tenantQuery_1 = require("../utils/tenantQuery");
/**
 * Create a balance history record
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param data - Balance history data
 * @param trx - Optional transaction to use
 * @returns Created balance history record
 */
const createBalanceHistory = async (tenantId, schemaName, data, trx) => {
    const execute = async (transaction) => {
        const changeDate = data.changeDate ?? (0, date_1.getCurrentDate)();
        const insertData = {
            ...data,
            tenantId,
            previousBalance: Number(data.previousBalance),
            newBalance: Number(data.newBalance),
            changeAmount: Number(data.changeAmount),
            changeDate: (0, date_1.formatDateToISOString)(changeDate),
        };
        return AccountBalanceHistory_1.AccountBalanceHistory.query(transaction).insert(insertData);
    };
    if (trx) {
        return execute(trx);
    }
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.createBalanceHistory = createBalanceHistory;
/**
 * Find balance history records with filters
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param filters - Filter criteria
 * @returns List of balance history records with total count
 */
const findBalanceHistory = async (tenantId, schemaName, filters) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        let query = AccountBalanceHistory_1.AccountBalanceHistory.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId);
        // Apply filters
        if (filters.accountId) {
            query = query.modify("byAccount", filters.accountId);
        }
        if (filters.journalEntryId) {
            query = query.modify("byJournalEntry", filters.journalEntryId);
        }
        if (filters.startDate && filters.endDate) {
            query = query.modify("byDateRange", filters.startDate, filters.endDate);
        }
        if (filters.changeType) {
            query = query.modify("byChangeType", filters.changeType);
        }
        // Get total count
        const total = await query.resultSize();
        // Apply pagination and sorting
        const offset = (filters.page - 1) * filters.limit;
        const history = await query
            .modify("recentFirst")
            .limit(filters.limit)
            .offset(offset);
        return { history, total };
    });
};
exports.findBalanceHistory = findBalanceHistory;
/**
 * Find balance history by account ID
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param accountId - Account ID
 * @param limit - Optional limit (default: 100)
 * @returns List of balance history records for the account
 */
const findBalanceHistoryByAccount = async (tenantId, schemaName, accountId, limit = 100) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        return AccountBalanceHistory_1.AccountBalanceHistory.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("byAccount", accountId)
            .modify("recentFirst")
            .limit(limit);
    });
};
exports.findBalanceHistoryByAccount = findBalanceHistoryByAccount;
/**
 * Find balance history by journal entry ID
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param journalEntryId - Journal entry ID
 * @returns List of balance history records for the journal entry
 */
const findBalanceHistoryByJournalEntry = async (tenantId, schemaName, journalEntryId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        return AccountBalanceHistory_1.AccountBalanceHistory.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("byJournalEntry", journalEntryId)
            .modify("recentFirst");
    });
};
exports.findBalanceHistoryByJournalEntry = findBalanceHistoryByJournalEntry;
/**
 * Get account balance at a specific point in time
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param accountId - Account ID
 * @param asOfDate - Date to get balance as of
 * @returns Balance at the specified date, or null if no history before that date
 */
const getAccountBalanceAsOf = async (tenantId, schemaName, accountId, asOfDate) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const history = await AccountBalanceHistory_1.AccountBalanceHistory.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("byAccount", accountId)
            .where("change_date", "<=", asOfDate)
            .modify("recentFirst")
            .first();
        if (!history) {
            return null;
        }
        return history.newBalance;
    });
};
exports.getAccountBalanceAsOf = getAccountBalanceAsOf;
