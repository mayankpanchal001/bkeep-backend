"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccount = exports.ExpenseSubtype = exports.RevenueSubtype = exports.EquitySubtype = exports.LiabilitySubtype = exports.AssetSubtype = exports.AccountType = void 0;
const BaseModel_1 = require("./BaseModel");
var AccountType;
(function (AccountType) {
    AccountType["ASSET"] = "asset";
    AccountType["LIABILITY"] = "liability";
    AccountType["EQUITY"] = "equity";
    AccountType["REVENUE"] = "revenue";
    AccountType["EXPENSE"] = "expense";
})(AccountType || (exports.AccountType = AccountType = {}));
var AssetSubtype;
(function (AssetSubtype) {
    AssetSubtype["CURRENT_ASSET"] = "current_asset";
    AssetSubtype["FIXED_ASSET"] = "fixed_asset";
    AssetSubtype["OTHER_ASSET"] = "other_asset";
})(AssetSubtype || (exports.AssetSubtype = AssetSubtype = {}));
var LiabilitySubtype;
(function (LiabilitySubtype) {
    LiabilitySubtype["CURRENT_LIABILITY"] = "current_liability";
    LiabilitySubtype["LONG_TERM_LIABILITY"] = "long_term_liability";
    LiabilitySubtype["OTHER_LIABILITY"] = "other_liability";
})(LiabilitySubtype || (exports.LiabilitySubtype = LiabilitySubtype = {}));
var EquitySubtype;
(function (EquitySubtype) {
    EquitySubtype["EQUITY"] = "equity";
    EquitySubtype["RETAINED_EARNINGS"] = "retained_earnings";
})(EquitySubtype || (exports.EquitySubtype = EquitySubtype = {}));
var RevenueSubtype;
(function (RevenueSubtype) {
    RevenueSubtype["OPERATING_REVENUE"] = "operating_revenue";
    RevenueSubtype["OTHER_REVENUE"] = "other_revenue";
})(RevenueSubtype || (exports.RevenueSubtype = RevenueSubtype = {}));
var ExpenseSubtype;
(function (ExpenseSubtype) {
    ExpenseSubtype["COST_OF_GOODS_SOLD"] = "cost_of_goods_sold";
    ExpenseSubtype["OPERATING_EXPENSE"] = "operating_expense";
    ExpenseSubtype["OTHER_EXPENSE"] = "other_expense";
})(ExpenseSubtype || (exports.ExpenseSubtype = ExpenseSubtype = {}));
/**
 * ChartOfAccount Model
 * Represents accounts in the Chart of Accounts (General Ledger)
 * Foundation for proper double-entry accounting
 */
class ChartOfAccount extends BaseModel_1.BaseModel {
    static get tableName() {
        return "chart_of_accounts";
    }
    // Relations
    parent;
    children;
    bankAccount;
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: ["tenantId", "createdBy", "accountName", "accountType"],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
                accountNumber: { type: ["string", "null"], maxLength: 50 },
                accountName: { type: "string", minLength: 1, maxLength: 255 },
                accountType: {
                    type: "string",
                    enum: ["asset", "liability", "equity", "revenue", "expense"],
                },
                accountSubtype: { type: ["string", "null"], maxLength: 100 },
                accountDetailType: { type: ["string", "null"], maxLength: 100 },
                parentAccountId: { type: ["string", "null"], format: "uuid" },
                currentBalance: { type: "number", default: 0 },
                openingBalance: { type: "number", default: 0 },
                isActive: { type: "boolean", default: true },
                isSystemAccount: { type: "boolean", default: false },
                currencyCode: {
                    type: "string",
                    minLength: 3,
                    maxLength: 3,
                    default: "CAD",
                },
                description: { type: ["string", "null"] },
                trackTax: { type: "boolean", default: false },
                defaultTaxId: { type: ["string", "null"], format: "uuid" },
                bankAccountNumber: { type: ["string", "null"], maxLength: 100 },
                bankRoutingNumber: { type: ["string", "null"], maxLength: 50 },
                bankAccountId: { type: ["string", "null"], format: "uuid" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    // Relation mappings
    static get relationMappings() {
        return {
            parent: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: ChartOfAccount,
                join: {
                    from: "chart_of_accounts.parent_account_id",
                    to: "chart_of_accounts.id",
                },
            },
            children: {
                relation: BaseModel_1.BaseModel.HasManyRelation,
                modelClass: ChartOfAccount,
                join: {
                    from: "chart_of_accounts.id",
                    to: "chart_of_accounts.parent_account_id",
                },
            },
            bankAccount: {
                relation: BaseModel_1.BaseModel.BelongsToOneRelation,
                modelClass: "Account",
                join: {
                    from: "chart_of_accounts.bank_account_id",
                    to: "accounts.id",
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
            active(query) {
                query.where("is_active", true);
            },
            byType(query, type) {
                query.where("account_type", type);
            },
            bySubtype(query, subtype) {
                query.where("account_subtype", subtype);
            },
            topLevel(query) {
                query.whereNull("parent_account_id");
            },
            withChildren(query) {
                query.withGraphFetched("children");
            },
            system(query) {
                query.where("is_system_account", true);
            },
            nonSystem(query) {
                query.where("is_system_account", false);
            },
        };
    }
    // Helper methods
    isAsset() {
        return this.accountType === AccountType.ASSET;
    }
    isLiability() {
        return this.accountType === AccountType.LIABILITY;
    }
    isEquity() {
        return this.accountType === AccountType.EQUITY;
    }
    isRevenue() {
        return this.accountType === AccountType.REVENUE;
    }
    isExpense() {
        return this.accountType === AccountType.EXPENSE;
    }
    isDebitAccount() {
        // Assets and Expenses increase with debits
        return this.isAsset() || this.isExpense();
    }
    isCreditAccount() {
        // Liabilities, Equity, and Revenue increase with credits
        return this.isLiability() || this.isEquity() || this.isRevenue();
    }
    /**
     * Update account balance based on debit or credit
     */
    updateBalance(amount, isDebit) {
        const currentBalance = Number(this.currentBalance || 0);
        const amountNum = Number(amount || 0);
        if (this.isDebitAccount()) {
            // Debit accounts: increase with debit, decrease with credit
            return isDebit ? currentBalance + amountNum : currentBalance - amountNum;
        }
        else {
            // Credit accounts: decrease with debit, increase with credit
            return isDebit ? currentBalance - amountNum : currentBalance + amountNum;
        }
    }
    /**
     * Get formatted account display name
     */
    getDisplayName() {
        return this.accountNumber
            ? `${this.accountNumber} - ${this.accountName}`
            : this.accountName;
    }
}
exports.ChartOfAccount = ChartOfAccount;
