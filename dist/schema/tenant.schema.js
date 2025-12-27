"use strict";
/**
 * Tenant Schema
 * Zod validation schemas for tenant-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTenantSchema = exports.createTenantSchema = exports.tenantIdSchema = exports.tenantListSchema = exports.TENANT_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for tenants
 */
exports.TENANT_SORT_FIELDS = [
    "name",
    "schemaName",
    "isActive",
    "createdAt",
    "updatedAt",
];
/**
 * Tenant list query schema
 * Includes pagination, sorting, search, and status filter
 */
exports.tenantListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z.enum(exports.TENANT_SORT_FIELDS).optional().default("createdAt"),
    isActive: zod_1.z
        .string()
        .transform((val) => val === "true")
        .pipe(zod_1.z.boolean())
        .optional(),
});
/**
 * Tenant ID schema
 * Validates UUID format for tenant ID
 */
exports.tenantIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid tenant ID format" }),
});
/**
 * Create tenant schema
 */
exports.createTenantSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, { message: "Tenant name is required" })
        .max(255, { message: "Tenant name must be at most 255 characters" }),
    schemaName: zod_1.z
        .string()
        .min(1, { message: "Schema name is required" })
        .max(63, { message: "Schema name must be at most 63 characters" })
        .regex(/^[a-z][\d_a-z]*$/, {
        message: "Schema name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores",
    }),
});
/**
 * Update tenant schema
 * Note: schemaName is immutable and cannot be updated
 * Using .strict() to reject any unknown fields including schemaName
 */
exports.updateTenantSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .min(1, { message: "Tenant name is required" })
        .max(255, { message: "Tenant name must be at most 255 characters" })
        .optional(),
    isActive: zod_1.z.boolean({ message: "isActive is required" }).optional(),
})
    .strict();
