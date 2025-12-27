"use strict";
/**
 * Account Schema
 * Zod validation schemas for account-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAccountActivationSchema = exports.updateAccountSchema = exports.createAccountSchema = exports.accountIdSchema = exports.accountListSchema = exports.ACCOUNT_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for accounts
 */
exports.ACCOUNT_SORT_FIELDS = [
    "name",
    "number",
    "currencyCode",
    "openingBalance",
    "isActive",
    "createdAt",
    "updatedAt",
];
/**
 * Account list query schema
 * Includes pagination, sorting, search, and status filter
 */
exports.accountListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z.enum(exports.ACCOUNT_SORT_FIELDS).optional().default("createdAt"),
    isActive: zod_1.z
        .string()
        .transform((val) => val === "true")
        .pipe(zod_1.z.boolean())
        .optional(),
    currencyCode: zod_1.z
        .string()
        .length(3, { message: "Currency code must be 3 characters" })
        .optional(),
});
/**
 * Account ID schema
 * Validates UUID format for account ID
 */
exports.accountIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid account ID format" }),
});
/**
 * Create account schema
 */
exports.createAccountSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, { message: "Account name is required" })
        .max(255, { message: "Account name must be at most 255 characters" }),
    number: zod_1.z
        .string()
        .max(255, { message: "Account number must be at most 255 characters" })
        .nullable()
        .optional(),
    type: zod_1.z
        .string()
        .max(255, { message: "Account type must be at most 255 characters" })
        .optional()
        .default("bank"),
    currencyCode: zod_1.z
        .string()
        .length(3, { message: "Currency code must be 3 characters (ISO 4217)" })
        .optional()
        .default("CAD"),
    openingBalance: zod_1.z
        .number({ message: "Opening balance must be a number" })
        .optional()
        .default(0),
    bankName: zod_1.z
        .string()
        .max(255, { message: "Bank name must be at most 255 characters" })
        .nullable()
        .optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
/**
 * Update account schema
 */
exports.updateAccountSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, { message: "Account name is required" })
        .max(255, { message: "Account name must be at most 255 characters" })
        .optional(),
    number: zod_1.z
        .string()
        .max(255, { message: "Account number must be at most 255 characters" })
        .nullable()
        .optional(),
    type: zod_1.z
        .string()
        .max(255, { message: "Account type must be at most 255 characters" })
        .optional(),
    currencyCode: zod_1.z
        .string()
        .length(3, { message: "Currency code must be 3 characters (ISO 4217)" })
        .optional(),
    openingBalance: zod_1.z
        .number({ message: "Opening balance must be a number" })
        .optional(),
    bankName: zod_1.z
        .string()
        .max(255, { message: "Bank name must be at most 255 characters" })
        .nullable()
        .optional(),
    isActive: zod_1.z.boolean().optional(),
});
/**
 * Update account activation status schema
 */
exports.updateAccountActivationSchema = zod_1.z.object({
    isActive: zod_1.z.boolean({ message: "isActive is required" }),
});
