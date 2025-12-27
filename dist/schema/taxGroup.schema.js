"use strict";
/**
 * Tax Group Schema
 * Zod validation schemas for tax group-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxGroupSchema = exports.updateTaxGroupSchema = exports.createTaxGroupSchema = exports.taxGroupIdSchema = exports.taxGroupListSchema = exports.TAX_GROUP_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for tax groups
 */
exports.TAX_GROUP_SORT_FIELDS = [
    "name",
    "isActive",
    "createdAt",
    "updatedAt",
];
/**
 * Tax group list query schema
 * Includes pagination, sorting, search, and filtering
 */
exports.taxGroupListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z.enum(exports.TAX_GROUP_SORT_FIELDS).optional().default("name"),
});
/**
 * Tax group ID schema
 * Validates UUID format for tax group ID
 */
exports.taxGroupIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid tax group ID format" }),
});
/**
 * Create tax group schema
 * Validates data for creating a new tax group
 */
exports.createTaxGroupSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "Tax group name is required")
        .max(255, "Tax group name must not exceed 255 characters"),
    description: zod_1.z
        .string()
        .max(1000, "Description must not exceed 1000 characters")
        .optional(),
    taxIds: zod_1.z
        .array(zod_1.z.string().uuid({ message: "Invalid tax ID format" }))
        .min(1, "At least one tax is required")
        .max(10, "Maximum 10 taxes per group"),
});
/**
 * Update tax group schema
 * Validates data for updating a tax group
 */
exports.updateTaxGroupSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "Tax group name is required")
        .max(255, "Tax group name must not exceed 255 characters")
        .optional(),
    description: zod_1.z
        .string()
        .max(1000, "Description must not exceed 1000 characters")
        .optional(),
    isActive: zod_1.z.boolean().optional(),
    taxIds: zod_1.z
        .array(zod_1.z.string().uuid({ message: "Invalid tax ID format" }))
        .min(1, "At least one tax is required")
        .max(10, "Maximum 10 taxes per group")
        .optional(),
});
/**
 * Calculate tax schema
 * Validates data for calculating tax with a tax group
 */
exports.calculateTaxGroupSchema = zod_1.z.object({
    amount: zod_1.z.coerce
        .number({ message: "Amount must be a number" })
        .min(0, "Amount must be 0 or greater"),
});
