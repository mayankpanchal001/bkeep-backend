"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxGroupController = exports.disableTaxGroup = exports.enableTaxGroup = exports.restoreTaxGroupById = exports.deleteTaxGroupById = exports.updateTaxGroupController = exports.createTaxGroupController = exports.getTaxGroupById = exports.getActiveTaxGroups = exports.getAllTaxGroups = void 0;
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const taxGroup_queries_1 = require("../queries/taxGroup.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all tax groups controller
 * Retrieves tax groups with pagination, sorting, search, and filtering
 */
exports.getAllTaxGroups = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch tax groups
    const { taxGroups, total } = await (0, taxGroup_queries_1.findTaxGroups)(tenantContext.tenantId, tenantContext.schemaName, filters);
    // Transform tax groups to response format
    const responseData = taxGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description ?? null,
        isActive: group.isActive,
        taxes: group.taxes?.map((tax) => ({
            id: tax.id,
            name: tax.name,
            type: tax.type,
            rate: tax.rate,
        })) ?? [],
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
    }));
    // Return response with pagination
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUPS_FETCHED, {
        items: responseData,
        pagination: (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total),
    }));
});
/**
 * Get active tax groups controller
 * Retrieves only active tax groups
 */
exports.getActiveTaxGroups = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Fetch active tax groups
    const taxGroups = await (0, taxGroup_queries_1.findActiveTaxGroups)(tenantContext.tenantId, tenantContext.schemaName);
    // Transform tax groups to response format
    const responseData = taxGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description ?? null,
        isActive: group.isActive,
        taxes: group.taxes?.map((tax) => ({
            id: tax.id,
            name: tax.name,
            type: tax.type,
            rate: tax.rate,
        })) ?? [],
    }));
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUPS_FETCHED, responseData));
});
/**
 * Get tax group by ID controller
 * Retrieves a single tax group by ID
 */
exports.getTaxGroupById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch tax group
    const taxGroup = await (0, taxGroup_queries_1.findTaxGroupById)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax group to response format
    const responseData = {
        id: taxGroup.id,
        name: taxGroup.name,
        description: taxGroup.description ?? null,
        isActive: taxGroup.isActive,
        taxes: taxGroup.taxes?.map((tax) => ({
            id: tax.id,
            name: tax.name,
            type: tax.type,
            rate: tax.rate,
        })) ?? [],
        createdAt: taxGroup.createdAt,
        updatedAt: taxGroup.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUP_FETCHED, responseData));
});
/**
 * Create tax group controller
 * Creates a new tax group
 */
exports.createTaxGroupController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated body
    const taxGroupData = req.validatedData;
    // Create tax group
    const taxGroup = await (0, taxGroup_queries_1.createTaxGroup)(tenantContext.tenantId, tenantContext.schemaName, taxGroupData, user.id);
    // Transform tax group to response format
    const responseData = {
        id: taxGroup.id,
        name: taxGroup.name,
        description: taxGroup.description ?? null,
        isActive: taxGroup.isActive,
        taxes: taxGroup.taxes?.map((tax) => ({
            id: tax.id,
            name: tax.name,
            type: tax.type,
            rate: tax.rate,
        })) ?? [],
        createdAt: taxGroup.createdAt,
        updatedAt: taxGroup.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.TAX_GROUP_CREATED, responseData));
});
/**
 * Update tax group controller
 * Updates tax group information
 */
exports.updateTaxGroupController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params and body
    const { id } = req.params;
    const updateData = req.validatedData;
    // Update tax group
    const updatedTaxGroup = await (0, taxGroup_queries_1.updateTaxGroup)(tenantContext.tenantId, tenantContext.schemaName, id, updateData);
    // Transform tax group to response format
    const responseData = {
        id: updatedTaxGroup.id,
        name: updatedTaxGroup.name,
        description: updatedTaxGroup.description ?? null,
        isActive: updatedTaxGroup.isActive,
        taxes: updatedTaxGroup.taxes?.map((tax) => ({
            id: tax.id,
            name: tax.name,
            type: tax.type,
            rate: tax.rate,
        })) ?? [],
        updatedAt: updatedTaxGroup.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUP_UPDATED, responseData));
});
/**
 * Delete tax group controller
 * Soft deletes a tax group
 */
exports.deleteTaxGroupById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Delete tax group
    const deletedTaxGroup = await (0, taxGroup_queries_1.deleteTaxGroup)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax group to response format
    const responseData = {
        id: deletedTaxGroup.id,
        name: deletedTaxGroup.name,
        deletedAt: deletedTaxGroup.deletedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUP_DELETED, responseData));
});
/**
 * Restore tax group controller
 * Restores a soft-deleted tax group
 */
exports.restoreTaxGroupById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Restore tax group
    const restoredTaxGroup = await (0, taxGroup_queries_1.restoreTaxGroup)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax group to response format
    const responseData = {
        id: restoredTaxGroup.id,
        name: restoredTaxGroup.name,
        isActive: restoredTaxGroup.isActive,
        updatedAt: restoredTaxGroup.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUP_RESTORED, responseData));
});
/**
 * Enable tax group controller
 * Enables a tax group
 */
exports.enableTaxGroup = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Enable tax group
    const enabledTaxGroup = await (0, taxGroup_queries_1.updateTaxGroupActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, true);
    // Transform tax group to response format
    const responseData = {
        id: enabledTaxGroup.id,
        name: enabledTaxGroup.name,
        isActive: enabledTaxGroup.isActive,
        updatedAt: enabledTaxGroup.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUP_ENABLED, responseData));
});
/**
 * Disable tax group controller
 * Disables a tax group
 */
exports.disableTaxGroup = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Disable tax group
    const disabledTaxGroup = await (0, taxGroup_queries_1.updateTaxGroupActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, false);
    // Transform tax group to response format
    const responseData = {
        id: disabledTaxGroup.id,
        name: disabledTaxGroup.name,
        isActive: disabledTaxGroup.isActive,
        updatedAt: disabledTaxGroup.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUP_DISABLED, responseData));
});
/**
 * Calculate tax with tax group controller
 * Calculates tax amount using a tax group
 */
exports.calculateTaxGroupController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params and body
    const { id } = req.params;
    const { amount } = req.validatedData;
    // Calculate tax
    const calculation = await (0, taxGroup_queries_1.calculateTaxWithGroup)(tenantContext.tenantId, tenantContext.schemaName, id, amount);
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_GROUP_CALCULATED, calculation));
});
