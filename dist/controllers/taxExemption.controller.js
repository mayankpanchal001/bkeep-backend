"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableTaxExemption = exports.enableTaxExemption = exports.restoreTaxExemptionById = exports.deleteTaxExemptionById = exports.updateTaxExemptionController = exports.createTaxExemptionController = exports.getTaxExemptionById = exports.getAllTaxExemptions = void 0;
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const taxExemption_queries_1 = require("../queries/taxExemption.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all tax exemptions controller
 * Retrieves tax exemptions with pagination, sorting, search, and filtering
 */
exports.getAllTaxExemptions = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch tax exemptions
    const { taxExemptions, total } = await (0, taxExemption_queries_1.findTaxExemptions)(tenantContext.tenantId, tenantContext.schemaName, filters);
    // Transform tax exemptions to response format
    const responseData = taxExemptions.map((exemption) => ({
        id: exemption.id,
        contactId: exemption.contactId,
        taxId: exemption.taxId ?? null,
        tax: exemption.tax
            ? {
                id: exemption.tax.id,
                name: exemption.tax.name,
                type: exemption.tax.type,
                rate: exemption.tax.rate,
            }
            : null,
        exemptionType: exemption.exemptionType,
        certificateNumber: exemption.certificateNumber ?? null,
        certificateExpiry: exemption.certificateExpiry ?? null,
        reason: exemption.reason ?? null,
        isActive: exemption.isActive,
        createdAt: exemption.createdAt,
        updatedAt: exemption.updatedAt,
    }));
    // Return response with pagination
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_EXEMPTIONS_FETCHED, {
        items: responseData,
        pagination: (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total),
    }));
});
/**
 * Get tax exemption by ID controller
 * Retrieves a single tax exemption by ID
 */
exports.getTaxExemptionById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch tax exemption
    const taxExemption = await (0, taxExemption_queries_1.findTaxExemptionById)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax exemption to response format
    const responseData = {
        id: taxExemption.id,
        contactId: taxExemption.contactId,
        taxId: taxExemption.taxId ?? null,
        tax: taxExemption.tax
            ? {
                id: taxExemption.tax.id,
                name: taxExemption.tax.name,
                type: taxExemption.tax.type,
                rate: taxExemption.tax.rate,
            }
            : null,
        exemptionType: taxExemption.exemptionType,
        certificateNumber: taxExemption.certificateNumber ?? null,
        certificateExpiry: taxExemption.certificateExpiry ?? null,
        reason: taxExemption.reason ?? null,
        isActive: taxExemption.isActive,
        createdAt: taxExemption.createdAt,
        updatedAt: taxExemption.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_EXEMPTION_FETCHED, responseData));
});
/**
 * Create tax exemption controller
 * Creates a new tax exemption
 */
exports.createTaxExemptionController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated body
    const taxExemptionData = req.validatedData;
    // Create tax exemption
    const taxExemption = await (0, taxExemption_queries_1.createTaxExemption)(tenantContext.tenantId, tenantContext.schemaName, taxExemptionData, user.id);
    // Transform tax exemption to response format
    const responseData = {
        id: taxExemption.id,
        contactId: taxExemption.contactId,
        taxId: taxExemption.taxId ?? null,
        tax: taxExemption.tax
            ? {
                id: taxExemption.tax.id,
                name: taxExemption.tax.name,
                type: taxExemption.tax.type,
                rate: taxExemption.tax.rate,
            }
            : null,
        exemptionType: taxExemption.exemptionType,
        certificateNumber: taxExemption.certificateNumber ?? null,
        certificateExpiry: taxExemption.certificateExpiry ?? null,
        reason: taxExemption.reason ?? null,
        isActive: taxExemption.isActive,
        createdAt: taxExemption.createdAt,
        updatedAt: taxExemption.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.TAX_EXEMPTION_CREATED, responseData));
});
/**
 * Update tax exemption controller
 * Updates tax exemption information
 */
exports.updateTaxExemptionController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params and body
    const { id } = req.params;
    const updateData = req.validatedData;
    // Update tax exemption
    const updatedTaxExemption = await (0, taxExemption_queries_1.updateTaxExemption)(tenantContext.tenantId, tenantContext.schemaName, id, updateData);
    // Transform tax exemption to response format
    const responseData = {
        id: updatedTaxExemption.id,
        contactId: updatedTaxExemption.contactId,
        taxId: updatedTaxExemption.taxId ?? null,
        tax: updatedTaxExemption.tax
            ? {
                id: updatedTaxExemption.tax.id,
                name: updatedTaxExemption.tax.name,
                type: updatedTaxExemption.tax.type,
                rate: updatedTaxExemption.tax.rate,
            }
            : null,
        exemptionType: updatedTaxExemption.exemptionType,
        certificateNumber: updatedTaxExemption.certificateNumber ?? null,
        certificateExpiry: updatedTaxExemption.certificateExpiry ?? null,
        reason: updatedTaxExemption.reason ?? null,
        isActive: updatedTaxExemption.isActive,
        updatedAt: updatedTaxExemption.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_EXEMPTION_UPDATED, responseData));
});
/**
 * Delete tax exemption controller
 * Soft deletes a tax exemption
 */
exports.deleteTaxExemptionById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Delete tax exemption
    const deletedTaxExemption = await (0, taxExemption_queries_1.deleteTaxExemption)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax exemption to response format
    const responseData = {
        id: deletedTaxExemption.id,
        contactId: deletedTaxExemption.contactId,
        deletedAt: deletedTaxExemption.deletedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_EXEMPTION_DELETED, responseData));
});
/**
 * Restore tax exemption controller
 * Restores a soft-deleted tax exemption
 */
exports.restoreTaxExemptionById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Restore tax exemption
    const restoredTaxExemption = await (0, taxExemption_queries_1.restoreTaxExemption)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform tax exemption to response format
    const responseData = {
        id: restoredTaxExemption.id,
        contactId: restoredTaxExemption.contactId,
        isActive: restoredTaxExemption.isActive,
        updatedAt: restoredTaxExemption.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_EXEMPTION_RESTORED, responseData));
});
/**
 * Enable tax exemption controller
 * Enables a tax exemption
 */
exports.enableTaxExemption = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Enable tax exemption
    const enabledTaxExemption = await (0, taxExemption_queries_1.updateTaxExemptionActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, true);
    // Transform tax exemption to response format
    const responseData = {
        id: enabledTaxExemption.id,
        contactId: enabledTaxExemption.contactId,
        isActive: enabledTaxExemption.isActive,
        updatedAt: enabledTaxExemption.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_EXEMPTION_ENABLED, responseData));
});
/**
 * Disable tax exemption controller
 * Disables a tax exemption
 */
exports.disableTaxExemption = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Disable tax exemption
    const disabledTaxExemption = await (0, taxExemption_queries_1.updateTaxExemptionActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, false);
    // Transform tax exemption to response format
    const responseData = {
        id: disabledTaxExemption.id,
        contactId: disabledTaxExemption.contactId,
        isActive: disabledTaxExemption.isActive,
        updatedAt: disabledTaxExemption.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.TAX_EXEMPTION_DISABLED, responseData));
});
