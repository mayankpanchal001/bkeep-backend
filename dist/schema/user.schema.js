"use strict";
/**
 * User Schema
 * Zod validation schemas for user-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitationIdSchema = exports.invitationListSchema = exports.INVITATION_SORT_FIELDS = exports.acceptInvitationSchema = exports.verifyInvitationSchema = exports.userInvitationSchema = exports.updateUserRolesSchema = exports.updateUserActivationSchema = exports.userIdSchema = exports.userListSchema = exports.USER_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const validation_1 = require("../constants/validation");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for users
 */
exports.USER_SORT_FIELDS = [
    "name",
    "email",
    "createdAt",
    "updatedAt",
    "lastLoggedInAt",
];
/**
 * User list query schema
 * Includes pagination, sorting, search, and status filter
 */
exports.userListSchema = shared_schema_1.paginationSortingSearchSchema
    .merge(shared_schema_1.statusFilterSchema)
    .extend({
    sort: zod_1.z.enum(exports.USER_SORT_FIELDS).optional().default("createdAt"),
    isVerified: zod_1.z
        .string()
        .transform((val) => val === "true")
        .pipe(zod_1.z.boolean())
        .optional(),
    isActive: zod_1.z
        .string()
        .transform((val) => val === "true")
        .pipe(zod_1.z.boolean())
        .optional(),
});
/**
 * User ID schema
 * Validates UUID format for user ID
 */
exports.userIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid user ID format" }),
});
/**
 * Update user activation status schema
 */
exports.updateUserActivationSchema = zod_1.z.object({
    isActive: zod_1.z.boolean({ message: "isActive is required" }),
});
/**
 * Update user roles schema
 */
exports.updateUserRolesSchema = zod_1.z.object({
    roleIds: zod_1.z
        .array(zod_1.z.string().uuid({ message: "Invalid role ID format" }))
        .min(1, { message: "At least one role ID is required" }),
});
/**
 * User invitation schema
 */
exports.userInvitationSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, { message: "Name is required" })
        .max(validation_1.VALIDATION_RULES.NAME_MAX_LENGTH, {
        message: `Name must not exceed ${validation_1.VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
    }),
    email: zod_1.z
        .string()
        .email({ message: "Invalid email format" })
        .max(255, { message: "Email must be at most 255 characters" }),
    roleId: zod_1.z.string().uuid({ message: "Invalid role ID format" }),
});
/**
 * Verify invitation schema
 * Validates query parameters for invitation verification
 */
exports.verifyInvitationSchema = zod_1.z.object({
    token: shared_schema_1.tokenSchema.refine((val) => val.length > 0, {
        message: validation_1.VALIDATION_MESSAGES.INVITATION_TOKEN_REQUIRED,
    }),
});
/**
 * Accept invitation schema
 * Validates request body for invitation acceptance
 */
exports.acceptInvitationSchema = zod_1.z.object({
    token: shared_schema_1.tokenSchema.refine((val) => val.length > 0, {
        message: validation_1.VALIDATION_MESSAGES.INVITATION_TOKEN_REQUIRED,
    }),
    password: shared_schema_1.passwordSchema.optional(),
});
/**
 * Valid sort fields for invitations
 */
exports.INVITATION_SORT_FIELDS = [
    "email",
    "createdAt",
    "updatedAt",
];
/**
 * Invitation list query schema
 * Includes pagination, sorting, and search
 */
exports.invitationListSchema = shared_schema_1.paginationSortingSearchSchema.extend({
    sort: zod_1.z.enum(exports.INVITATION_SORT_FIELDS).optional().default("createdAt"),
});
/**
 * Invitation ID schema
 * Validates UUID format for invitation ID
 */
exports.invitationIdSchema = zod_1.z.object({
    invitationId: zod_1.z.string().uuid({ message: "Invalid invitation ID format" }),
});
