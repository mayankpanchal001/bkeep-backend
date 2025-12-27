"use strict";
/**
 * Pagination Constants
 * Standardized pagination constants used throughout the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SORT_ORDER = exports.PAGINATION_DEFAULTS = void 0;
/**
 * Pagination default values and limits
 */
exports.PAGINATION_DEFAULTS = {
    PAGE_MIN: 1,
    PAGE_DEFAULT: 1,
    LIMIT_MIN: 1,
    LIMIT_MAX: 100,
    LIMIT_DEFAULT: 20,
};
/**
 * Sort order options
 */
exports.SORT_ORDER = {
    ASC: "asc",
    DESC: "desc",
};
