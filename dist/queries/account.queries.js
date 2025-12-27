"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileAccount = exports.updateAccountBalance = exports.restoreAccount = exports.updateAccountActivationStatus = exports.deleteAccount = exports.updateAccount = exports.createAccount = exports.findAccountById = exports.findAccounts = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const Account_1 = require("../models/Account");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
const tenantQuery_1 = require("../utils/tenantQuery");
/**
 * Map sort field to database column
 */
const mapAccountSortField = (field) => {
    const fieldMap = {
        name: "name",
        number: "number",
        currencyCode: "currency_code",
        openingBalance: "opening_balance",
        isActive: "is_active",
        createdAt: "created_at",
        updatedAt: "updated_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "created_at";
};
/**
 * Find accounts with pagination, sorting, search, and filtering
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing accounts array and total count
 */
const findAccounts = async (tenantId, schemaName, filters) => {
    const { page, limit, sort = "createdAt", order = "asc", search, isActive, currencyCode, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapAccountSortField(sort);
    // Use shared connection with tenant schema search path
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Build base query
        let query = Account_1.Account.query(trx).modify("notDeleted");
        // Filter by tenant
        query = query.modify("byTenant", tenantId);
        // Apply active filter if provided
        if (isActive !== undefined) {
            if (isActive) {
                query = query.modify("active");
            }
            else {
                query = query.modify("inactive");
            }
        }
        // Apply currency filter if provided
        if (currencyCode) {
            query = query.where("currency_code", currencyCode);
        }
        // Apply search if provided
        if (search) {
            query = query.modify("search", search);
        }
        // Get total count before pagination
        const total = await query.resultSize();
        // Apply pagination and sorting
        const accounts = await query
            .orderBy(sortColumn, order)
            .limit(limit)
            .offset(offset);
        return { accounts, total };
    });
};
exports.findAccounts = findAccounts;
/**
 * Find account by ID
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID (UUID)
 * @returns Account object
 * @throws ApiError if account not found
 */
const findAccountById = async (tenantId, schemaName, accountId) => {
    // Use shared connection with tenant schema search path
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const account = await Account_1.Account.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
        }
        return account;
    });
};
exports.findAccountById = findAccountById;
/**
 * Create account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param createdBy - User ID who created the account
 * @param data - Account data
 * @returns Created account
 */
const createAccount = async (tenantId, schemaName, createdBy, data) => {
    // Use shared connection with tenant schema search path
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const account = await Account_1.Account.query(trx).insert({
            tenantId,
            createdBy,
            name: data.name,
            number: data.number ?? null,
            type: data.type ?? "bank",
            currencyCode: data.currencyCode ?? "CAD",
            openingBalance: data.openingBalance ?? 0,
            currentBalance: data.openingBalance ?? 0, // Initialize current balance to opening balance
            bankName: data.bankName ?? null,
            isActive: data.isActive ?? true,
        });
        return account;
    });
};
exports.createAccount = createAccount;
/**
 * Update account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param data - Update data
 * @returns Updated account
 */
const updateAccount = async (tenantId, schemaName, accountId, data) => {
    // Get account first to ensure it exists and belongs to tenant
    const account = await (0, exports.findAccountById)(tenantId, schemaName, accountId);
    // Use shared connection with tenant schema search path
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const updatedAccount = await account.$query(trx).patchAndFetch(data);
        return updatedAccount;
    });
};
exports.updateAccount = updateAccount;
/**
 * Delete account (soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Deleted account
 */
const deleteAccount = async (tenantId, schemaName, accountId) => {
    // Verify account exists and belongs to tenant
    await (0, exports.findAccountById)(tenantId, schemaName, accountId);
    // Use shared connection with tenant schema search path
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Use BaseModel softDelete() method which handles timestamps automatically
        const account = await Account_1.Account.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
        }
        // Use BaseModel softDelete() - it handles deletedAt and updatedAt automatically
        await account
            .$query(trx)
            .patch({ deletedAt: (0, date_1.getCurrentISOString)() });
        // Reload to get updated data (without notDeleted modifier to include deleted records)
        const deletedAccount = await Account_1.Account.query(trx)
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!deletedAccount) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
        }
        return deletedAccount;
    });
};
exports.deleteAccount = deleteAccount;
/**
 * Update account activation status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param isActive - Activation status (true = active, false = inactive)
 * @returns Updated account
 */
const updateAccountActivationStatus = async (tenantId, schemaName, accountId, isActive) => {
    // Get account first to ensure it exists and belongs to tenant
    const account = await (0, exports.findAccountById)(tenantId, schemaName, accountId);
    // Use shared connection with tenant schema search path
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const updatedAccount = await account
            .$query(trx)
            .patchAndFetch({ isActive });
        return updatedAccount;
    });
};
exports.updateAccountActivationStatus = updateAccountActivationStatus;
/**
 * Restore account (un-soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Restored account
 */
const restoreAccount = async (tenantId, schemaName, accountId) => {
    // Use shared connection with tenant schema search path
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const account = await Account_1.Account.query(trx)
            .modify("deleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND_OR_NOT_DELETED);
        }
        // Restore the account using BaseModel restore() which handles timestamps automatically
        await account.$query(trx).patch({ deletedAt: null });
        // Reload to get updated data
        const restoredAccount = await Account_1.Account.query(trx)
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!restoredAccount) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
        }
        return restoredAccount;
    });
};
exports.restoreAccount = restoreAccount;
/**
 * Update account balance from transaction
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param amount - Amount to add/subtract
 * @param isIncrease - true to increase balance, false to decrease
 * @returns Updated account
 */
const updateAccountBalance = async (tenantId, schemaName, accountId, amount, isIncrease) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const account = await Account_1.Account.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
        }
        const amountNum = Number(amount || 0);
        const newBalance = account.updateBalance(amountNum, isIncrease);
        const updated = await account.$query(trx).patchAndFetch({
            currentBalance: Number(newBalance),
        });
        return updated;
    });
};
exports.updateAccountBalance = updateAccountBalance;
/**
 * Reconcile account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param reconciledBalance - Balance at reconciliation
 * @param reconciledBy - User ID who performed reconciliation
 * @returns Updated account
 */
const reconcileAccount = async (tenantId, schemaName, accountId, reconciledBalance, reconciledBy) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const account = await Account_1.Account.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
        }
        const updated = await account.$query(trx).patchAndFetch({
            lastReconciledAt: (0, date_1.getCurrentDate)(),
            reconciledBalance,
            lastReconciledBy: reconciledBy,
        });
        return updated;
    });
};
exports.reconcileAccount = reconcileAccount;
