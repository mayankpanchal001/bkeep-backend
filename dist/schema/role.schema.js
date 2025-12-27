"use strict";
/**
 * Role Schema
 * Zod validation schemas for role-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRolePermissionsSchema = exports.roleIdSchema = exports.roleListSchema = exports.ROLE_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for roles
 */
exports.ROLE_SORT_FIELDS = [
    "name",
    "displayName",
    "createdAt",
    "updatedAt",
];
/**
 * Role list query schema
 * Includes pagination, sorting, search, and status filter
 */
exports.roleListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z.enum(exports.ROLE_SORT_FIELDS).optional().default("displayName"),
});
/**
 * Role ID parameter schema
 * Validates UUID format for role ID
 */
exports.roleIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid role ID format" }),
});
/**
 * Update role permissions schema
 * Validates array of permission IDs to assign to a role
 */
exports.updateRolePermissionsSchema = zod_1.z.object({
    permissionIds: zod_1.z
        .array(zod_1.z.string().uuid({ message: "Invalid permission ID format" }))
        .min(0, { message: "Permission IDs array cannot be negative" })
        .default([]),
});
