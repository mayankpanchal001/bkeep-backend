"use strict";
/**
 * Chart of Account Schema
 * Zod validation schemas for chart of account-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChartOfAccountSchema = exports.createChartOfAccountSchema = exports.chartOfAccountIdSchema = exports.chartOfAccountListSchema = exports.CHART_OF_ACCOUNT_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for chart of accounts
 */
exports.CHART_OF_ACCOUNT_SORT_FIELDS = [
    "accountNumber",
    "accountName",
    "accountType",
    "currentBalance",
    "openingBalance",
    "isActive",
    "createdAt",
    "updatedAt",
];
/**
 * Chart of account list query schema
 * Includes pagination, sorting, search, and filtering
 */
exports.chartOfAccountListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z
        .enum(exports.CHART_OF_ACCOUNT_SORT_FIELDS)
        .optional()
        .default("accountName"),
    accountType: zod_1.z
        .enum(["asset", "liability", "equity", "revenue", "expense"])
        .optional(),
    accountSubtype: zod_1.z.string().max(100).optional(),
    parentAccountId: zod_1.z
        .string()
        .uuid({ message: "Invalid parent account ID format" })
        .nullable()
        .optional(),
});
/**
 * Chart of account ID schema
 * Validates UUID format for account ID
 */
exports.chartOfAccountIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid chart of account ID format" }),
});
/**
 * Create chart of account schema
 */
exports.createChartOfAccountSchema = zod_1.z.object({
    accountNumber: zod_1.z
        .string()
        .max(50, { message: "Account number must be at most 50 characters" })
        .optional(),
    accountName: zod_1.z
        .string()
        .min(1, { message: "Account name is required" })
        .max(255, { message: "Account name must be at most 255 characters" }),
    accountType: zod_1.z.enum(["asset", "liability", "equity", "revenue", "expense"], {
        message: "Invalid account type",
    }),
    accountSubtype: zod_1.z
        .string()
        .max(100, { message: "Account subtype must be at most 100 characters" })
        .optional(),
    accountDetailType: zod_1.z
        .string()
        .max(100, {
        message: "Account detail type must be at most 100 characters",
    })
        .optional(),
    parentAccountId: zod_1.z
        .string()
        .uuid({ message: "Invalid parent account ID format" })
        .optional(),
    openingBalance: zod_1.z
        .number({ message: "Opening balance must be a number" })
        .optional()
        .default(0),
    currencyCode: zod_1.z
        .string()
        .length(3, { message: "Currency code must be 3 characters (ISO 4217)" })
        .optional()
        .default("CAD"),
    description: zod_1.z.string().optional(),
    trackTax: zod_1.z.boolean().optional().default(false),
    defaultTaxId: zod_1.z
        .string()
        .uuid({ message: "Invalid tax ID format" })
        .optional(),
    bankAccountNumber: zod_1.z
        .string()
        .max(100, { message: "Bank account number must be at most 100 characters" })
        .optional(),
    bankRoutingNumber: zod_1.z
        .string()
        .max(50, { message: "Bank routing number must be at most 50 characters" })
        .optional(),
});
/**
 * Update chart of account schema
 */
exports.updateChartOfAccountSchema = zod_1.z.object({
    accountNumber: zod_1.z
        .string()
        .max(50, { message: "Account number must be at most 50 characters" })
        .optional(),
    accountName: zod_1.z
        .string()
        .min(1, { message: "Account name is required" })
        .max(255, { message: "Account name must be at most 255 characters" })
        .optional(),
    accountSubtype: zod_1.z
        .string()
        .max(100, { message: "Account subtype must be at most 100 characters" })
        .optional(),
    accountDetailType: zod_1.z
        .string()
        .max(100, {
        message: "Account detail type must be at most 100 characters",
    })
        .optional(),
    parentAccountId: zod_1.z
        .string()
        .uuid({ message: "Invalid parent account ID format" })
        .nullable()
        .optional(),
    currencyCode: zod_1.z
        .string()
        .length(3, { message: "Currency code must be 3 characters (ISO 4217)" })
        .optional(),
    description: zod_1.z.string().nullable().optional(),
    trackTax: zod_1.z.boolean().optional(),
    defaultTaxId: zod_1.z
        .string()
        .uuid({ message: "Invalid tax ID format" })
        .nullable()
        .optional(),
    bankAccountNumber: zod_1.z
        .string()
        .max(100, { message: "Bank account number must be at most 100 characters" })
        .nullable()
        .optional(),
    bankRoutingNumber: zod_1.z
        .string()
        .max(50, { message: "Bank routing number must be at most 50 characters" })
        .nullable()
        .optional(),
    isActive: zod_1.z.boolean().optional(),
});
