"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaxStatisticsController = exports.getTaxStatusController = exports.disableTax = exports.enableTax = exports.restoreTaxById = exports.deleteTaxById = exports.updateTaxController = exports.createTaxController = exports.getTaxById = exports.getActiveTaxes = exports.getAllTaxes = void 0;
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const tax_queries_1 = require("../queries/tax.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all taxes controller
 * Retrieves taxes with pagination, sorting, search, and filtering
 * Taxes are filtered by tenant from tenant context
 */
exports.getAllTaxes = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch taxes
    const { taxes, total } = await (0, tax_queries_1.findTaxes)(tenantContext.tenantId, tenantContext.schemaName, filters);
    // Transform taxes to response format (exclude internal fields)
    const taxesData = taxes.map((tax) => ({
        id: tax.id,
        name: tax.name,
        type: tax.type,
        rate: tax.rate,
        isActive: tax.isActive,
        createdAt: tax.createdAt,
        updatedAt: tax.updatedAt,
    }));
    // Get pagination metadata
    const pagination = (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total);
    // Prepare response data
    const responseData = {
        items: taxesData,
        pagination,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAXES_FETCHED, responseData));
});
/**
 * Get active taxes controller
 * Retrieves only active taxes (no pagination)
 */
exports.getActiveTaxes = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Fetch active taxes
    const taxes = await (0, tax_queries_1.findActiveTaxes)(tenantContext.tenantId, tenantContext.schemaName);
    // Transform taxes to response format
    const taxesData = taxes.map((tax) => ({
        id: tax.id,
        name: tax.name,
        type: tax.type,
        rate: tax.rate,
        isActive: tax.isActive,
    }));
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAXES_FETCHED, taxesData));
});
/**
 * Get tax by ID controller
 * Retrieves a specific tax by their ID
 */
exports.getTaxById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch tax
    const tax = await (0, tax_queries_1.findTaxById)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax to response format
    const responseData = {
        id: tax.id,
        name: tax.name,
        type: tax.type,
        rate: tax.rate,
        isActive: tax.isActive,
        createdAt: tax.createdAt,
        updatedAt: tax.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_FETCHED, responseData));
});
/**
 * Create tax controller
 * Creates a new tax
 */
exports.createTaxController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated body
    const taxData = req.validatedData;
    // Create tax
    const tax = await (0, tax_queries_1.createTax)(tenantContext.tenantId, tenantContext.schemaName, taxData, user.id);
    // Transform tax to response format
    const responseData = {
        id: tax.id,
        name: tax.name,
        type: tax.type,
        rate: tax.rate,
        isActive: tax.isActive,
        createdAt: tax.createdAt,
        updatedAt: tax.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.TAX_CREATED, responseData));
});
/**
 * Update tax controller
 * Updates tax information
 */
exports.updateTaxController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params and body
    const { id } = req.params;
    const updateData = req.validatedData;
    // Update tax
    const updatedTax = await (0, tax_queries_1.updateTax)(tenantContext.tenantId, tenantContext.schemaName, id, updateData);
    // Transform tax to response format
    const responseData = {
        id: updatedTax.id,
        name: updatedTax.name,
        type: updatedTax.type,
        rate: updatedTax.rate,
        isActive: updatedTax.isActive,
        updatedAt: updatedTax.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_UPDATED, responseData));
});
/**
 * Delete tax controller
 * Soft deletes a tax by their ID
 */
exports.deleteTaxById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Delete tax
    const deletedTax = await (0, tax_queries_1.deleteTax)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax to response format
    const responseData = {
        id: deletedTax.id,
        name: deletedTax.name,
        deletedAt: deletedTax.deletedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_DELETED, responseData));
});
/**
 * Restore tax controller
 * Restores a soft-deleted tax
 */
exports.restoreTaxById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Restore tax
    const restoredTax = await (0, tax_queries_1.restoreTax)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax to response format
    const responseData = {
        id: restoredTax.id,
        name: restoredTax.name,
        isActive: restoredTax.isActive,
        updatedAt: restoredTax.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_RESTORED, responseData));
});
/**
 * Enable tax controller
 * Enables a tax by setting isActive to true
 */
exports.enableTax = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Enable tax
    const enabledTax = await (0, tax_queries_1.updateTaxActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, true);
    // Transform tax to response format
    const responseData = {
        id: enabledTax.id,
        name: enabledTax.name,
        isActive: enabledTax.isActive,
        updatedAt: enabledTax.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_ENABLED, responseData));
});
/**
 * Disable tax controller
 * Disables a tax by setting isActive to false
 */
exports.disableTax = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Disable tax
    const disabledTax = await (0, tax_queries_1.updateTaxActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, false);
    // Transform tax to response format
    const responseData = {
        id: disabledTax.id,
        name: disabledTax.name,
        isActive: disabledTax.isActive,
        updatedAt: disabledTax.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_DISABLED, responseData));
});
/**
 * Get tax status controller
 * Retrieves the status information of a specific tax
 */
exports.getTaxStatusController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch tax status
    const statusData = await (0, tax_queries_1.getTaxStatus)(tenantContext.tenantId, tenantContext.schemaName, id);
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_STATUS_RETRIEVED, statusData));
});
/**
 * Get tax statistics controller
 * Retrieves aggregate statistics about taxes
 */
exports.getTaxStatisticsController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Fetch tax statistics
    const statistics = await (0, tax_queries_1.getTaxStatistics)(tenantContext.tenantId, tenantContext.schemaName);
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_STATISTICS_RETRIEVED, statistics));
});
