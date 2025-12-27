"use strict";
/**
 * Shared Schema
 * Reusable Zod validation schemas for pagination, filtering, and sorting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginationMetadata = exports.calculateOffset = exports.completeFilterSchema = exports.paginationSortingSearchSchema = exports.paginationSortingSchema = exports.statusFilterSchema = exports.dateRangeSchema = exports.searchSchema = exports.sortingSchema = exports.paginationSchema = exports.tokenSchema = exports.passwordSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
const pagination_1 = require("../constants/pagination");
const validation_1 = require("../constants/validation");
/**
 * Reusable field validation schemas
 */
/**
 * Email validation schema
 * Reusable email field validation
 */
exports.emailSchema = zod_1.z
    .string()
    .email({ message: "Invalid email format" })
    .max(validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH, {
    message: `Email must not exceed ${validation_1.VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
});
/**
 * Password validation schema
 * Reusable password field validation
 */
exports.passwordSchema = zod_1.z
    .string()
    .min(validation_1.VALIDATION_RULES.PASSWORD_MIN_LENGTH, {
    message: validation_1.VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH,
})
    .max(validation_1.VALIDATION_RULES.PASSWORD_MAX_LENGTH, {
    message: validation_1.VALIDATION_MESSAGES.PASSWORD_MAX_LENGTH,
});
/**
 * Token validation schema
 * Reusable token field validation (for invitation tokens, reset tokens, etc.)
 */
exports.tokenSchema = zod_1.z.string().min(1, { message: "Token is required" });
/**
 * Base pagination schema
 * Used for query parameters in list endpoints
 */
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default(String(pagination_1.PAGINATION_DEFAULTS.PAGE_DEFAULT))
        .transform((val) => {
        const page = Number.parseInt(val, 10);
        return Number.isNaN(page) || page < pagination_1.PAGINATION_DEFAULTS.PAGE_MIN
            ? pagination_1.PAGINATION_DEFAULTS.PAGE_DEFAULT
            : page;
    }),
    limit: zod_1.z
        .string()
        .optional()
        .default(String(pagination_1.PAGINATION_DEFAULTS.LIMIT_DEFAULT))
        .transform((val) => {
        const limit = Number.parseInt(val, 10);
        if (Number.isNaN(limit) || limit < pagination_1.PAGINATION_DEFAULTS.LIMIT_MIN) {
            return pagination_1.PAGINATION_DEFAULTS.LIMIT_DEFAULT;
        }
        return Math.min(limit, pagination_1.PAGINATION_DEFAULTS.LIMIT_MAX);
    }),
});
/**
 * Base sorting schema
 * Used for query parameters to specify sort field and order
 */
exports.sortingSchema = zod_1.z.object({
    sort: zod_1.z.string().optional(),
    order: zod_1.z
        .enum([pagination_1.SORT_ORDER.ASC, pagination_1.SORT_ORDER.DESC])
        .optional()
        .default(pagination_1.SORT_ORDER.ASC),
});
/**
 * Base search/filter schema
 * Used for query parameters to search and filter results
 */
exports.searchSchema = zod_1.z.object({
    search: zod_1.z
        .string()
        .min(1, { message: "Search term must not be empty" })
        .max(255, { message: "Search term must not exceed 255 characters" })
        .optional(),
});
/**
 * Date range filter schema
 * Used for filtering by date ranges
 */
exports.dateRangeSchema = zod_1.z.object({
    from: zod_1.z
        .string()
        .datetime({ message: 'Invalid date format for "from" date' })
        .optional(),
    to: zod_1.z
        .string()
        .datetime({ message: 'Invalid date format for "to" date' })
        .optional(),
});
/**
 * Status filter schema
 * Used for filtering by active/inactive status
 */
exports.statusFilterSchema = zod_1.z.object({
    isActive: zod_1.z
        .string()
        .transform((val) => val === "true")
        .pipe(zod_1.z.boolean())
        .optional(),
});
/**
 * Combined pagination and sorting schema
 * Most common combination for list endpoints
 */
exports.paginationSortingSchema = exports.paginationSchema.merge(exports.sortingSchema);
/**
 * Combined pagination, sorting, and search schema
 * Full-featured schema for advanced list endpoints
 */
exports.paginationSortingSearchSchema = exports.paginationSortingSchema.merge(exports.searchSchema);
/**
 * Complete filtering schema
 * Includes pagination, sorting, search, date range, and status filters
 */
exports.completeFilterSchema = exports.paginationSortingSearchSchema
    .merge(exports.dateRangeSchema)
    .merge(exports.statusFilterSchema);
/**
 * Helper function to calculate offset from page and limit
 */
const calculateOffset = (page, limit) => {
    return (page - 1) * limit;
};
exports.calculateOffset = calculateOffset;
/**
 * Helper function to get pagination metadata
 */
const getPaginationMetadata = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    const offset = (0, exports.calculateOffset)(page, limit);
    return {
        page,
        limit,
        offset,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
};
exports.getPaginationMetadata = getPaginationMetadata;
