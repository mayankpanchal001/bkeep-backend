"use strict";
/**
 * Tax Schema
 * Zod validation schemas for tax-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaxSchema = exports.createTaxSchema = exports.taxIdSchema = exports.taxListSchema = exports.taxTypeEnum = exports.TAX_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for taxes
 */
exports.TAX_SORT_FIELDS = [
    "name",
    "type",
    "rate",
    "isActive",
    "createdAt",
    "updatedAt",
];
/**
 * Tax type enum for validation
 */
exports.taxTypeEnum = zod_1.z.enum(["normal", "compound", "withholding"]);
/**
 * Tax list query schema
 * Includes pagination, sorting, search, and filtering
 */
exports.taxListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z.enum(exports.TAX_SORT_FIELDS).optional().default("name"),
    type: exports.taxTypeEnum.optional(),
});
/**
 * Tax ID schema
 * Validates UUID format for tax ID
 */
exports.taxIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid tax ID format" }),
});
/**
 * Create tax schema
 * Validates data for creating a new tax
 */
exports.createTaxSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "Tax name is required")
        .max(255, "Tax name must not exceed 255 characters"),
    type: exports.taxTypeEnum.default("normal"),
    rate: zod_1.z.coerce
        .number({ message: "Tax rate must be a number" })
        .min(0, "Tax rate must be 0 or greater")
        .max(100, "Tax rate must not exceed 100"),
    isActive: zod_1.z.boolean().optional().default(true),
});
/**
 * Update tax schema
 * Validates data for updating a tax
 */
exports.updateTaxSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "Tax name is required")
        .max(255, "Tax name must not exceed 255 characters")
        .optional(),
    type: exports.taxTypeEnum.optional(),
    rate: zod_1.z.coerce
        .number({ message: "Tax rate must be a number" })
        .min(0, "Tax rate must be 0 or greater")
        .max(100, "Tax rate must not exceed 100")
        .optional(),
    isActive: zod_1.z.boolean().optional(),
});
