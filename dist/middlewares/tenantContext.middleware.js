"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantContext = exports.requireTenantContext = exports.setTenantContext = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const tenant_queries_1 = require("../queries/tenant.queries");
const ApiError_1 = require("../utils/ApiError");
/**
 * Set tenant context middleware
 * Extracts tenant information from authenticated user and sets tenant context
 * The tenant context includes tenant ID, name, and schema name
 *
 * @param req - Express request object (extended with user and tenantContext properties)
 * @param _res - Express response object (unused)
 * @param next - Express next function
 *
 * @example
 * // Use in routes that need tenant context
 * router.get('/accounts', authenticate, setTenantContext, getAccounts)
 *
 * @remarks
 * - Requires authentication middleware to run first
 * - Gets tenantId from req.user.selectedTenantId (from JWT token)
 * - Fetches tenant from database and verifies it's active
 * - Sets req.tenantContext with tenant information
 * - If user doesn't have tenantId or tenant is inactive, continues without context
 * - Uses shared database connection pool (no new connections created)
 */
const setTenantContext = async (req, _res, next) => {
    try {
        const user = req.user;
        if (!user) {
            // User not authenticated, continue without tenant context
            return next();
        }
        // Get tenantId from JWT user
        if (!user.selectedTenantId) {
            // User doesn't have a tenant assigned, continue without tenant context
            return next();
        }
        // Fetch tenant from database
        const tenant = await (0, tenant_queries_1.findTenantById)(user.selectedTenantId);
        if (!tenant?.isActive) {
            // Tenant is inactive or doesn't exist, continue without tenant context
            return next();
        }
        // Set tenant context
        req.tenantContext = {
            tenantId: tenant.id,
            tenantName: tenant.name,
            schemaName: tenant.schemaName,
        };
        next();
    }
    catch (error) {
        // Log error but don't fail the request
        // This allows routes that don't require tenant context to continue
        logger_1.default.error("Error setting tenant context:", error);
        next();
    }
};
exports.setTenantContext = setTenantContext;
/**
 * Require tenant context middleware
 * Ensures that tenant context is set before proceeding
 * Returns 403 Forbidden if tenant context is not available
 *
 * @param req - Express request object (extended with tenantContext property)
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * // Use in routes that require tenant context
 * router.get('/accounts', authenticate, setTenantContext, requireTenantContext, getAccounts)
 *
 * @throws {ApiError} 403 Forbidden if tenant context is not set
 */
const requireTenantContext = (req, _res, next) => {
    if (!req.tenantContext) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED);
    }
    next();
};
exports.requireTenantContext = requireTenantContext;
/**
 * Get tenant context from request
 * Helper function to extract tenant context from request object
 *
 * @param req - Express request object (extended with tenantContext property)
 * @returns Tenant context or undefined
 *
 * @example
 * // In a controller
 * const tenantContext = getTenantContext(req)
 * if (tenantContext) {
 *   // Use withTenantSchema() utility for queries
 *   const accounts = await withTenantSchema(tenantContext.schemaName, async (knex) => {
 *     return await Account.query(knex).where('is_active', true)
 *   })
 * }
 */
const getTenantContext = (req) => {
    return req.tenantContext;
};
exports.getTenantContext = getTenantContext;
