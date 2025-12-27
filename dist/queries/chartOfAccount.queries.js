"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkBankAccountToChartAccount = exports.updateChartOfAccountBalance = exports.restoreChartOfAccount = exports.updateChartOfAccountActivationStatus = exports.getAccountHierarchy = exports.deleteChartOfAccount = exports.updateChartOfAccount = exports.createChartOfAccount = exports.validateAccountRules = exports.findChartOfAccountByNumber = exports.findChartOfAccountById = exports.findChartOfAccounts = exports.generateAccountNumber = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const ChartOfAccount_1 = require("../models/ChartOfAccount");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
const tenantQuery_1 = require("../utils/tenantQuery");
/**
 * Generate next account number based on account type
 * Asset: 1000-1999
 * Liability: 2000-2999
 * Equity: 3000-3999
 * Revenue: 4000-4999
 * Expense: 5000-5999
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param accountType - Account type
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
const generateAccountNumber = async (tenantId, schemaName, accountType, trx) => {
    const execute = async (transaction) => {
        const ranges = {
            [ChartOfAccount_1.AccountType.ASSET]: { min: 1000, max: 1999 },
            [ChartOfAccount_1.AccountType.LIABILITY]: { min: 2000, max: 2999 },
            [ChartOfAccount_1.AccountType.EQUITY]: { min: 3000, max: 3999 },
            [ChartOfAccount_1.AccountType.REVENUE]: { min: 4000, max: 4999 },
            [ChartOfAccount_1.AccountType.EXPENSE]: { min: 5000, max: 5999 },
        };
        // eslint-disable-next-line security/detect-object-injection
        const range = ranges[accountType];
        // Find highest account number in range
        const highest = await ChartOfAccount_1.ChartOfAccount.query(transaction)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .where("account_type", accountType)
            .whereRaw("CAST(account_number AS INTEGER) >= ?", [range.min])
            .whereRaw("CAST(account_number AS INTEGER) <= ?", [range.max])
            .orderByRaw("CAST(account_number AS INTEGER) DESC")
            .first();
        if (!highest?.accountNumber) {
            return String(range.min);
        }
        const nextNumber = Number.parseInt(highest.accountNumber, 10) + 1;
        if (nextNumber > range.max) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, `Account number range ${range.min}-${range.max} is full for ${accountType} accounts`);
        }
        return String(nextNumber);
    };
    // If transaction is provided, use it directly
    if (trx) {
        return execute(trx);
    }
    // Otherwise, create a new transaction
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.generateAccountNumber = generateAccountNumber;
/**
 * Map sort field to database column
 */
const mapChartOfAccountSortField = (field) => {
    const fieldMap = {
        accountNumber: "account_number",
        accountName: "account_name",
        accountType: "account_type",
        currentBalance: "current_balance",
        openingBalance: "opening_balance",
        isActive: "is_active",
        createdAt: "created_at",
        updatedAt: "updated_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "account_name";
};
/**
 * Find chart of accounts with pagination, sorting, search, and filtering
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing accounts array and total count
 */
const findChartOfAccounts = async (tenantId, schemaName, filters) => {
    const { page, limit, sort = "accountName", order = "asc", search, isActive, accountType, accountSubtype, parentAccountId, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapChartOfAccountSortField(sort);
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Build base query
        let query = ChartOfAccount_1.ChartOfAccount.query(trx).modify("notDeleted");
        // Filter by tenant
        query = query.modify("byTenant", tenantId);
        // Apply active filter if provided
        if (isActive !== undefined) {
            if (isActive) {
                query = query.modify("active");
            }
            else {
                query = query.where("is_active", false);
            }
        }
        // Apply account type filter if provided
        if (accountType) {
            query = query.modify("byType", accountType);
        }
        // Apply account subtype filter if provided
        if (accountSubtype) {
            query = query.modify("bySubtype", accountSubtype);
        }
        // Apply parent account filter if provided
        if (parentAccountId !== undefined) {
            if (parentAccountId === null) {
                query = query.modify("topLevel");
            }
            else {
                query = query.where("parent_account_id", parentAccountId);
            }
        }
        // Apply search if provided
        if (search) {
            query = query.where((builder) => {
                builder
                    .where("account_name", "ilike", `%${search}%`)
                    .orWhere("account_number", "ilike", `%${search}%`)
                    .orWhere("description", "ilike", `%${search}%`);
            });
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
exports.findChartOfAccounts = findChartOfAccounts;
/**
 * Find chart of account by ID
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID (UUID)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Chart of account object
 * @throws ApiError if account not found
 */
const findChartOfAccountById = async (tenantId, schemaName, accountId, trx) => {
    const execute = async (transaction) => {
        const account = await ChartOfAccount_1.ChartOfAccount.query(transaction)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND);
        }
        return account;
    };
    // If transaction is provided, use it directly
    if (trx) {
        return execute(trx);
    }
    // Otherwise, create a new transaction
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.findChartOfAccountById = findChartOfAccountById;
/**
 * Find chart of account by account number
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountNumber - Account number
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Chart of account object or null if not found
 */
const findChartOfAccountByNumber = async (tenantId, schemaName, accountNumber, trx) => {
    const execute = async (transaction) => {
        const account = await ChartOfAccount_1.ChartOfAccount.query(transaction)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .where("account_number", accountNumber)
            .first();
        return account ?? null;
    };
    // If transaction is provided, use it directly
    if (trx) {
        return execute(trx);
    }
    // Otherwise, create a new transaction
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.findChartOfAccountByNumber = findChartOfAccountByNumber;
/**
 * Create chart of account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param createdBy - User ID who created the account
 * @param data - Account data
 * @returns Created account
 * @throws ApiError if account number already exists
 */
/**
 * Validate account rules before create/update
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @param data - Account data to validate
 * @param accountId - Optional account ID (for updates)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 */
const validateAccountRules = async (tenantId, schemaName, data, accountId, trx) => {
    // Validate parent account type matches child type
    if (data.parentAccountId) {
        const parent = await (0, exports.findChartOfAccountById)(tenantId, schemaName, data.parentAccountId, trx);
        if (data.accountType &&
            parent.accountType !== data.accountType) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_PARENT_TYPE_MISMATCH);
        }
    }
    // Validate account number uniqueness
    if (data.accountNumber) {
        const existing = await (0, exports.findChartOfAccountByNumber)(tenantId, schemaName, data.accountNumber, trx);
        if (existing && existing.id !== accountId) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NUMBER_EXISTS);
        }
    }
    // Validate cannot change type if has transactions (TODO: implement when journal entries are added)
    if (accountId && data.accountType) {
        const account = await (0, exports.findChartOfAccountById)(tenantId, schemaName, accountId, trx);
        if (account.accountType !== data.accountType) {
            // Check if account has journal entries
            // TODO: Implement when journal entries are added
            // if (hasJournalEntries) {
            //   throw new ApiError(...)
            // }
        }
    }
};
exports.validateAccountRules = validateAccountRules;
const createChartOfAccount = async (tenantId, schemaName, createdBy, data) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Auto-generate account number if not provided
        let accountNumber = data.accountNumber;
        accountNumber ??= await (0, exports.generateAccountNumber)(tenantId, schemaName, data.accountType, trx);
        // Validate account rules (pass transaction for nested calls)
        await (0, exports.validateAccountRules)(tenantId, schemaName, {
            ...data,
            accountNumber,
        }, undefined, trx);
        // Validate parent account exists if provided
        if (data.parentAccountId) {
            const parent = await (0, exports.findChartOfAccountById)(tenantId, schemaName, data.parentAccountId, trx);
            // Validate parent type matches
            if (parent.accountType !== data.accountType) {
                throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_PARENT_TYPE_MISMATCH);
            }
        }
        const account = await ChartOfAccount_1.ChartOfAccount.query(trx).insert({
            tenantId,
            createdBy,
            accountNumber,
            accountName: data.accountName,
            accountType: data.accountType,
            accountSubtype: data.accountSubtype ?? null,
            accountDetailType: data.accountDetailType ?? null,
            parentAccountId: data.parentAccountId ?? null,
            openingBalance: data.openingBalance ?? 0,
            currentBalance: data.openingBalance ?? 0,
            currencyCode: data.currencyCode ?? "CAD",
            description: data.description ?? null,
            trackTax: data.trackTax ?? false,
            defaultTaxId: data.defaultTaxId ?? null,
            bankAccountNumber: data.bankAccountNumber ?? null,
            bankRoutingNumber: data.bankRoutingNumber ?? null,
            isActive: true,
            isSystemAccount: false,
        });
        return account;
    });
};
exports.createChartOfAccount = createChartOfAccount;
/**
 * Update chart of account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param data - Update data
 * @returns Updated account
 * @throws ApiError if account number already exists or parent account doesn't exist
 */
const updateChartOfAccount = async (tenantId, schemaName, accountId, data) => {
    // Get account first to ensure it exists and belongs to tenant
    const account = await (0, exports.findChartOfAccountById)(tenantId, schemaName, accountId);
    // Check if it's a system account (cannot be modified)
    if (account.isSystemAccount) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_IS_SYSTEM);
    }
    // Check if account number is being changed and if it already exists
    if (data.accountNumber && data.accountNumber !== account.accountNumber) {
        const existing = await (0, exports.findChartOfAccountByNumber)(tenantId, schemaName, data.accountNumber);
        if (existing && existing.id !== accountId) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NUMBER_EXISTS);
        }
    }
    // Validate account rules
    await (0, exports.validateAccountRules)(tenantId, schemaName, data, accountId);
    // Validate parent account exists if provided
    if (data.parentAccountId) {
        await (0, exports.findChartOfAccountById)(tenantId, schemaName, data.parentAccountId);
        // Note: accountType cannot be changed in update, so we don't validate it here
        // Parent type validation is handled in validateAccountRules
    }
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const updatedAccount = await account.$query(trx).patchAndFetch(data);
        return updatedAccount;
    });
};
exports.updateChartOfAccount = updateChartOfAccount;
/**
 * Delete chart of account (soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Deleted account
 * @throws ApiError if account has children or is a system account
 */
const deleteChartOfAccount = async (tenantId, schemaName, accountId) => {
    // Verify account exists and belongs to tenant
    const account = await (0, exports.findChartOfAccountById)(tenantId, schemaName, accountId);
    // Check if it's a system account (cannot be deleted)
    if (account.isSystemAccount) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_IS_SYSTEM);
    }
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Check if account has children
        const hasChildren = await ChartOfAccount_1.ChartOfAccount.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .where("parent_account_id", accountId)
            .first();
        if (hasChildren) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_HAS_CHILDREN);
        }
        // Soft delete using direct Knex update (bypasses Objection validation)
        await trx("chart_of_accounts")
            .where("id", accountId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: (0, date_1.getCurrentDate)(),
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload to get updated data (without notDeleted modifier to include deleted records)
        const deletedAccount = await ChartOfAccount_1.ChartOfAccount.query(trx)
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!deletedAccount) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND);
        }
        return deletedAccount;
    });
};
exports.deleteChartOfAccount = deleteChartOfAccount;
/**
 * Get account hierarchy (parent accounts with children)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @returns Array of top-level accounts with their children
 */
const getAccountHierarchy = async (tenantId, schemaName) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        return ChartOfAccount_1.ChartOfAccount.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("active")
            .modify("topLevel")
            .withGraphFetched("children")
            .modifyGraph("children", (builder) => {
            builder
                .modify("notDeleted")
                .modify("byTenant", tenantId)
                .modify("active")
                .orderBy("account_number", "asc")
                .orderBy("account_name", "asc");
        })
            .orderBy("account_number", "asc")
            .orderBy("account_name", "asc");
    });
};
exports.getAccountHierarchy = getAccountHierarchy;
/**
 * Update chart of account activation status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param isActive - Activation status (true = active, false = inactive)
 * @returns Updated account
 */
const updateChartOfAccountActivationStatus = async (tenantId, schemaName, accountId, isActive) => {
    // Get account first to ensure it exists and belongs to tenant
    const account = await (0, exports.findChartOfAccountById)(tenantId, schemaName, accountId);
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const updatedAccount = await account
            .$query(trx)
            .patchAndFetch({ isActive });
        return updatedAccount;
    });
};
exports.updateChartOfAccountActivationStatus = updateChartOfAccountActivationStatus;
/**
 * Restore chart of account (un-soft delete)
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @returns Restored account
 */
const restoreChartOfAccount = async (tenantId, schemaName, accountId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const account = await ChartOfAccount_1.ChartOfAccount.query(trx)
            .modify("deleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND);
        }
        // Restore the account
        await trx("chart_of_accounts")
            .where("id", accountId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: null,
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload to get updated data
        const restoredAccount = await ChartOfAccount_1.ChartOfAccount.query(trx)
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!restoredAccount) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND);
        }
        return restoredAccount;
    });
};
exports.restoreChartOfAccount = restoreChartOfAccount;
/**
 * Update chart of account balance from transaction/journal entry
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param accountId - Account ID
 * @param amount - Amount to add/subtract
 * @param isDebit - true for debit, false for credit
 * @returns Updated account
 */
const updateChartOfAccountBalance = async (tenantId, schemaName, accountId, amount, isDebit) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const account = await ChartOfAccount_1.ChartOfAccount.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(accountId);
        if (!account) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.CHART_OF_ACCOUNT_NOT_FOUND);
        }
        const amountNum = Number(amount || 0);
        const newBalance = account.updateBalance(amountNum, isDebit);
        const updated = await account.$query(trx).patchAndFetch({
            currentBalance: Number(newBalance),
        });
        return updated;
    });
};
exports.updateChartOfAccountBalance = updateChartOfAccountBalance;
/**
 * Link a bank account to a chart of account
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param chartAccountId - Chart of account ID
 * @param bankAccountId - Bank account ID (from accounts table)
 * @returns Updated chart account
 */
const linkBankAccountToChartAccount = async (tenantId, schemaName, chartAccountId, bankAccountId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify chart account exists
        const chartAccount = await (0, exports.findChartOfAccountById)(tenantId, schemaName, chartAccountId, trx);
        // Verify bank account exists (import Account model)
        const { Account } = await Promise.resolve().then(() => __importStar(require("../models/Account")));
        const bankAccount = await Account.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(bankAccountId);
        if (!bankAccount) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
        }
        // Update chart account with bank account link
        const updated = await chartAccount.$query(trx).patchAndFetch({
            bankAccountId,
            bankAccountNumber: bankAccount.number ?? null,
        });
        return updated;
    });
};
exports.linkBankAccountToChartAccount = linkBankAccountToChartAccount;
