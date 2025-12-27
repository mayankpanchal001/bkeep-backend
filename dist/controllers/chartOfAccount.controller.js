"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImportFields = exports.downloadChartOfAccountSample = exports.restoreChartOfAccountById = exports.disableChartOfAccount = exports.enableChartOfAccount = exports.deleteChartOfAccountById = exports.updateChartOfAccountController = exports.createChartOfAccountController = exports.getChartOfAccountById = exports.getChartOfAccountHierarchy = exports.getAllChartOfAccounts = void 0;
const XLSX = __importStar(require("xlsx"));
const chartOfAccount_1 = require("../constants/chartOfAccount");
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const chartOfAccount_queries_1 = require("../queries/chartOfAccount.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all chart of accounts controller
 * Retrieves chart of accounts with pagination, sorting, search, and filtering
 * Accounts are filtered by tenant from tenant context
 */
exports.getAllChartOfAccounts = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch accounts
    const { accounts, total } = await (0, chartOfAccount_queries_1.findChartOfAccounts)(tenantContext.tenantId, tenantContext.schemaName, filters);
    // Transform accounts to response format (exclude internal fields)
    const accountsData = accounts.map((account) => ({
        id: account.id,
        accountNumber: account.accountNumber ?? null,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubtype: account.accountSubtype ?? null,
        accountDetailType: account.accountDetailType ?? null,
        parentAccountId: account.parentAccountId ?? null,
        currentBalance: account.currentBalance,
        openingBalance: account.openingBalance,
        currencyCode: account.currencyCode,
        isActive: account.isActive,
        description: account.description ?? null,
        trackTax: account.trackTax,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
    }));
    // Get pagination metadata
    const pagination = (0, shared_schema_1.getPaginationMetadata)(filters.page, filters.limit, total);
    // Prepare response data
    const responseData = {
        items: accountsData,
        pagination,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNTS_FETCHED, responseData));
});
/**
 * Get chart of account hierarchy controller
 * Retrieves top-level accounts with their children
 */
exports.getChartOfAccountHierarchy = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Fetch hierarchy
    const hierarchy = await (0, chartOfAccount_queries_1.getAccountHierarchy)(tenantContext.tenantId, tenantContext.schemaName);
    // Transform accounts to response format
    const hierarchyData = hierarchy.map((account) => ({
        id: account.id,
        accountNumber: account.accountNumber ?? null,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubtype: account.accountSubtype ?? null,
        currentBalance: account.currentBalance,
        currencyCode: account.currencyCode,
        isActive: account.isActive,
        children: account.children?.map((child) => ({
            id: child.id,
            accountNumber: child.accountNumber ?? null,
            accountName: child.accountName,
            accountType: child.accountType,
            currentBalance: child.currentBalance,
            currencyCode: child.currencyCode,
            isActive: child.isActive,
        })),
    }));
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNTS_FETCHED, hierarchyData));
});
/**
 * Get chart of account by ID controller
 * Retrieves a specific account by their ID
 */
exports.getChartOfAccountById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch account
    const account = await (0, chartOfAccount_queries_1.findChartOfAccountById)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform account to response format (exclude internal fields)
    const accountData = {
        id: account.id,
        accountNumber: account.accountNumber ?? null,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubtype: account.accountSubtype ?? null,
        accountDetailType: account.accountDetailType ?? null,
        parentAccountId: account.parentAccountId ?? null,
        currentBalance: account.currentBalance,
        openingBalance: account.openingBalance,
        currencyCode: account.currencyCode,
        isActive: account.isActive,
        isSystemAccount: account.isSystemAccount,
        description: account.description ?? null,
        trackTax: account.trackTax,
        defaultTaxId: account.defaultTaxId ?? null,
        bankAccountNumber: account.bankAccountNumber ?? null,
        bankRoutingNumber: account.bankRoutingNumber ?? null,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_FETCHED, accountData));
});
/**
 * Create chart of account controller
 * Creates a new account in the tenant schema
 */
exports.createChartOfAccountController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated body data
    const accountData = req.validatedData;
    // Create account
    const account = await (0, chartOfAccount_queries_1.createChartOfAccount)(tenantContext.tenantId, tenantContext.schemaName, user.id, accountData);
    // Transform account to response format
    const responseData = {
        id: account.id,
        accountNumber: account.accountNumber ?? null,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubtype: account.accountSubtype ?? null,
        currentBalance: account.currentBalance,
        openingBalance: account.openingBalance,
        currencyCode: account.currencyCode,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_CREATED, responseData));
});
/**
 * Update chart of account controller
 * Updates account information
 */
exports.updateChartOfAccountController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params and body
    const { id } = req.params;
    const updateData = req.validatedData;
    // Update account
    const updatedAccount = await (0, chartOfAccount_queries_1.updateChartOfAccount)(tenantContext.tenantId, tenantContext.schemaName, id, updateData);
    // Transform account to response format
    const responseData = {
        id: updatedAccount.id,
        accountNumber: updatedAccount.accountNumber ?? null,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        currentBalance: updatedAccount.currentBalance,
        isActive: updatedAccount.isActive,
        updatedAt: updatedAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_UPDATED, responseData));
});
/**
 * Delete chart of account controller
 * Soft deletes an account by their ID
 */
exports.deleteChartOfAccountById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Delete account
    const deletedAccount = await (0, chartOfAccount_queries_1.deleteChartOfAccount)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform account to response format
    const responseData = {
        id: deletedAccount.id,
        accountNumber: deletedAccount.accountNumber ?? null,
        accountName: deletedAccount.accountName,
        accountType: deletedAccount.accountType,
        deletedAt: deletedAccount.deletedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_DELETED, responseData));
});
/**
 * Enable chart of account controller
 * Enables an account
 */
exports.enableChartOfAccount = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Enable account
    const updatedAccount = await (0, chartOfAccount_queries_1.updateChartOfAccountActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, true);
    // Transform account to response format
    const responseData = {
        id: updatedAccount.id,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        isActive: updatedAccount.isActive,
        updatedAt: updatedAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_ENABLED, responseData));
});
/**
 * Disable chart of account controller
 * Disables an account
 */
exports.disableChartOfAccount = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Disable account
    const updatedAccount = await (0, chartOfAccount_queries_1.updateChartOfAccountActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, false);
    // Transform account to response format
    const responseData = {
        id: updatedAccount.id,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        isActive: updatedAccount.isActive,
        updatedAt: updatedAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_DISABLED, responseData));
});
/**
 * Restore chart of account controller
 * Restores a soft-deleted account
 */
exports.restoreChartOfAccountById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Restore account
    const restoredAccount = await (0, chartOfAccount_queries_1.restoreChartOfAccount)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform account to response format
    const responseData = {
        id: restoredAccount.id,
        accountNumber: restoredAccount.accountNumber ?? null,
        accountName: restoredAccount.accountName,
        accountType: restoredAccount.accountType,
        isActive: restoredAccount.isActive,
        createdAt: restoredAccount.createdAt,
        updatedAt: restoredAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_UPDATED, responseData));
});
/**
 * Download chart of account sample file controller
 * Generates and downloads an XLSX sample file for importing chart of accounts
 */
exports.downloadChartOfAccountSample = (0, asyncHandler_1.default)(async (_req, res) => {
    // Prepare sample data
    const sampleData = chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.SAMPLE_DATA;
    // Prepare worksheet data with headers
    const worksheetData = [
        // Header row
        [...chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.HEADERS],
        // Data rows
        ...sampleData.map((row) => [
            row.accountNumber ?? "",
            row.accountName,
            row.type,
            row.detailType ?? "",
            row.openingBalance ?? "",
        ]),
        // Empty row
        [],
        // Instruction rows
        ...chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.INSTRUCTIONS.map((instruction) => [
            instruction,
        ]),
    ];
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    // Set column widths for better readability
    worksheet["!cols"] = [...chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.COLUMN_WIDTHS];
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.WORKSHEET_NAME);
    // Generate XLSX buffer
    const xlsxBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
    });
    // Set response headers for XLSX download
    res.setHeader("Content-Type", chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.CONTENT_TYPE);
    res.setHeader("Content-Disposition", `attachment; filename="${chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.FILENAME}"`);
    res.setHeader("Content-Length", xlsxBuffer.length);
    // Send XLSX content
    res.status(http_1.HTTP_STATUS.OK).send(xlsxBuffer);
});
/**
 * Get available import fields controller
 * Returns the list of fields that can be mapped during import
 */
exports.getImportFields = (0, asyncHandler_1.default)(async (_req, res) => {
    const importFields = chartOfAccount_1.CHART_OF_ACCOUNT_SAMPLE.IMPORT_FIELDS.map((field) => ({
        key: field.key,
        label: field.label,
        required: field.required,
    }));
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.CHART_OF_ACCOUNT_IMPORT_FIELDS_FETCHED, importFields));
});
