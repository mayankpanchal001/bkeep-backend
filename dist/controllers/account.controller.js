"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreAccountById = exports.deactivateAccount = exports.activateAccount = exports.deleteAccountById = exports.updateAccountController = exports.createAccountController = exports.getAccountStatus = exports.getAccountById = exports.getAllAccounts = void 0;
const http_1 = require("../constants/http");
const success_1 = require("../constants/success");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const account_queries_1 = require("../queries/account.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all accounts controller
 * Retrieves accounts with pagination, sorting, search, and filtering
 * Accounts are filtered by tenant from tenant context
 */
exports.getAllAccounts = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated query parameters
    const filters = req.validatedData;
    // Fetch accounts
    const { accounts, total } = await (0, account_queries_1.findAccounts)(tenantContext.tenantId, tenantContext.schemaName, filters);
    // Transform accounts to response format
    const accountsData = accounts.map((account) => ({
        id: account.id,
        name: account.name,
        number: account.number ?? null,
        type: account.type,
        currencyCode: account.currencyCode,
        openingBalance: account.openingBalance,
        bankName: account.bankName ?? null,
        isActive: account.isActive,
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
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNTS_RETRIEVED, responseData));
});
/**
 * Get account by ID controller
 * Retrieves a specific account by their ID
 */
exports.getAccountById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch account
    const account = await (0, account_queries_1.findAccountById)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform account to response format
    const accountData = {
        id: account.id,
        name: account.name,
        number: account.number ?? null,
        type: account.type,
        currencyCode: account.currencyCode,
        openingBalance: account.openingBalance,
        bankName: account.bankName ?? null,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNT_RETRIEVED, accountData));
});
/**
 * Get account status controller
 * Retrieves the status information of an account
 */
exports.getAccountStatus = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Fetch account
    const account = await (0, account_queries_1.findAccountById)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform account status to response format
    const statusData = {
        id: account.id,
        name: account.name,
        isActive: account.isActive,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNT_STATUS_RETRIEVED, statusData));
});
/**
 * Create account controller
 * Creates a new account in the tenant schema
 */
exports.createAccountController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    const user = req.user;
    // Get validated body data
    const accountData = req.validatedData;
    // Create account
    const account = await (0, account_queries_1.createAccount)(tenantContext.tenantId, tenantContext.schemaName, user.id, accountData);
    // Transform account to response format
    const responseData = {
        id: account.id,
        name: account.name,
        number: account.number ?? null,
        type: account.type,
        currencyCode: account.currencyCode,
        openingBalance: account.openingBalance,
        bankName: account.bankName ?? null,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.CREATED)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.CREATED, success_1.SUCCESS_MESSAGES.ACCOUNT_CREATED, responseData));
});
/**
 * Update account controller
 * Updates account information
 */
exports.updateAccountController = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params and body
    const { id } = req.params;
    const updateData = req.validatedData;
    // Update account
    const updatedAccount = await (0, account_queries_1.updateAccount)(tenantContext.tenantId, tenantContext.schemaName, id, updateData);
    // Transform account to response format
    const responseData = {
        id: updatedAccount.id,
        name: updatedAccount.name,
        number: updatedAccount.number ?? null,
        currencyCode: updatedAccount.currencyCode,
        openingBalance: updatedAccount.openingBalance,
        bankName: updatedAccount.bankName ?? null,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt,
        updatedAt: updatedAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNT_UPDATED, responseData));
});
/**
 * Delete account controller
 * Soft deletes an account by their ID
 */
exports.deleteAccountById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Delete account
    const deletedAccount = await (0, account_queries_1.deleteAccount)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform account to response format
    const responseData = {
        id: deletedAccount.id,
        name: deletedAccount.name,
        number: deletedAccount.number ?? null,
        type: deletedAccount.type,
        currencyCode: deletedAccount.currencyCode,
        openingBalance: deletedAccount.openingBalance,
        bankName: deletedAccount.bankName ?? null,
        isActive: deletedAccount.isActive,
        createdAt: deletedAccount.createdAt,
        updatedAt: deletedAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNT_DELETED, responseData));
});
/**
 * Activate account controller
 * Activates an account
 */
exports.activateAccount = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Activate account
    const updatedAccount = await (0, account_queries_1.updateAccountActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, true);
    // Transform account to response format
    const responseData = {
        id: updatedAccount.id,
        name: updatedAccount.name,
        number: updatedAccount.number ?? null,
        type: updatedAccount.type,
        currencyCode: updatedAccount.currencyCode,
        openingBalance: updatedAccount.openingBalance,
        bankName: updatedAccount.bankName ?? null,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt,
        updatedAt: updatedAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNT_ACTIVATED, responseData));
});
/**
 * Deactivate account controller
 * Deactivates an account
 */
exports.deactivateAccount = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Deactivate account
    const updatedAccount = await (0, account_queries_1.updateAccountActivationStatus)(tenantContext.tenantId, tenantContext.schemaName, id, false);
    // Transform account to response format
    const responseData = {
        id: updatedAccount.id,
        name: updatedAccount.name,
        number: updatedAccount.number ?? null,
        type: updatedAccount.type,
        currencyCode: updatedAccount.currencyCode,
        openingBalance: updatedAccount.openingBalance,
        bankName: updatedAccount.bankName ?? null,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt,
        updatedAt: updatedAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNT_DEACTIVATED, responseData));
});
/**
 * Restore account controller
 * Restores a soft-deleted account
 */
exports.restoreAccountById = (0, asyncHandler_1.default)(async (req, res) => {
    const tenantContext = (0, tenantContext_middleware_1.getTenantContext)(req);
    // Get validated params
    const { id } = req.params;
    // Restore account
    const restoredAccount = await (0, account_queries_1.restoreAccount)(tenantContext.tenantId, tenantContext.schemaName, id);
    // Transform account to response format
    const responseData = {
        id: restoredAccount.id,
        name: restoredAccount.name,
        number: restoredAccount.number ?? null,
        type: restoredAccount.type,
        currencyCode: restoredAccount.currencyCode,
        openingBalance: restoredAccount.openingBalance,
        bankName: restoredAccount.bankName ?? null,
        isActive: restoredAccount.isActive,
        createdAt: restoredAccount.createdAt,
        updatedAt: restoredAccount.updatedAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.ACCOUNT_RESTORED, responseData));
});
