"use strict";
/**
 * Tax Exemption Schema
 * Zod validation schemas for tax exemption-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaxExemptionSchema = exports.createTaxExemptionSchema = exports.taxExemptionIdSchema = exports.taxExemptionListSchema = exports.TAX_EXEMPTION_SORT_FIELDS = exports.taxExemptionTypeEnum = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Tax exemption type enum for validation
 */
exports.taxExemptionTypeEnum = zod_1.z.enum([
    "resale",
    "non_profit",
    "government",
    "other",
]);
/**
 * Valid sort fields for tax exemptions
 */
exports.TAX_EXEMPTION_SORT_FIELDS = [
    "exemptionType",
    "certificateExpiry",
    "isActive",
    "createdAt",
    "updatedAt",
];
/**
 * Tax exemption list query schema
 * Includes pagination, sorting, search, and filtering
 */
exports.taxExemptionListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z.enum(exports.TAX_EXEMPTION_SORT_FIELDS).optional().default("createdAt"),
    contactId: zod_1.z
        .string()
        .uuid({ message: "Invalid contact ID format" })
        .optional(),
    taxId: zod_1.z.string().uuid({ message: "Invalid tax ID format" }).optional(),
    exemptionType: exports.taxExemptionTypeEnum.optional(),
    expired: zod_1.z.boolean().optional(),
});
/**
 * Tax exemption ID schema
 * Validates UUID format for tax exemption ID
 */
exports.taxExemptionIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid tax exemption ID format" }),
});
/**
 * Create tax exemption schema
 * Validates data for creating a new tax exemption
 */
exports.createTaxExemptionSchema = zod_1.z.object({
    contactId: zod_1.z.string().uuid({ message: "Invalid contact ID format" }),
    taxId: zod_1.z
        .string()
        .uuid({ message: "Invalid tax ID format" })
        .nullable()
        .optional(),
    exemptionType: exports.taxExemptionTypeEnum.default("resale"),
    certificateNumber: zod_1.z
        .string()
        .max(255, "Certificate number must not exceed 255 characters")
        .optional(),
    certificateExpiry: zod_1.z
        .string()
        .date({ message: "Invalid date format" })
        .optional()
        .nullable(),
    reason: zod_1.z
        .string()
        .max(1000, "Reason must not exceed 1000 characters")
        .optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
/**
 * Update tax exemption schema
 * Validates data for updating a tax exemption
 */
exports.updateTaxExemptionSchema = zod_1.z.object({
    taxId: zod_1.z
        .string()
        .uuid({ message: "Invalid tax ID format" })
        .nullable()
        .optional(),
    exemptionType: exports.taxExemptionTypeEnum.optional(),
    certificateNumber: zod_1.z
        .string()
        .max(255, "Certificate number must not exceed 255 characters")
        .optional(),
    certificateExpiry: zod_1.z
        .string()
        .date({ message: "Invalid date format" })
        .optional()
        .nullable(),
    reason: zod_1.z
        .string()
        .max(1000, "Reason must not exceed 1000 characters")
        .optional(),
    isActive: zod_1.z.boolean().optional(),
});
