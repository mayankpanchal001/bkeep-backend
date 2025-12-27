"use strict";
/**
 * Audit Log Schema
 * Zod validation schemas for audit log endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogListSchema = exports.actorTypeSchema = exports.auditLogIdSchema = void 0;
const zod_1 = require("zod");
const pagination_1 = require("../constants/pagination");
const shared_schema_1 = require("./shared.schema");
/**
 * Audit log ID schema
 */
exports.auditLogIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid audit log ID format" }),
});
/**
 * Actor type schema
 */
exports.actorTypeSchema = zod_1.z.enum(["user", "system", "api_key"]);
/**
 * Audit log list query schema
 */
exports.auditLogListSchema = shared_schema_1.paginationSchema.merge(shared_schema_1.sortingSchema).extend({
    action: zod_1.z.string().optional(), // Supports namespaced actions like 'user.logged_in'
    actorType: exports.actorTypeSchema.optional(),
    actorId: zod_1.z.string().uuid().optional(),
    targetType: zod_1.z.string().optional(),
    targetId: zod_1.z.string().uuid().optional(),
    tenantId: zod_1.z.string().uuid().optional(),
    success: zod_1.z
        .string()
        .transform((val) => val === "true")
        .pipe(zod_1.z.boolean())
        .optional(),
    startDate: zod_1.z
        .string()
        .datetime({ message: "Invalid date format for start date" })
        .optional(),
    endDate: zod_1.z
        .string()
        .datetime({ message: "Invalid date format for end date" })
        .optional(),
    sort: zod_1.z
        .enum(["occurredAt", "createdAt", "action"])
        .optional()
        .default("occurredAt"),
    order: zod_1.z
        .enum([pagination_1.SORT_ORDER.ASC, pagination_1.SORT_ORDER.DESC])
        .optional()
        .default(pagination_1.SORT_ORDER.DESC),
});
