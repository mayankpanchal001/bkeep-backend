"use strict";
/**
 * Audit Log Controller
 * Handles HTTP requests for audit log operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogsByActor = exports.getAuditLogsByTarget = exports.getAuditLogById = exports.getAllAuditLogs = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const roles_1 = require("../constants/roles");
const success_1 = require("../constants/success");
const audit_queries_1 = require("../queries/audit.queries");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../utils/ApiResponse");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
/**
 * Get all audit logs controller
 * Retrieves audit logs with pagination, sorting, and filtering
 * SuperAdmin can see all logs, Admin can only see logs from their own tenant
 */
exports.getAllAuditLogs = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated query parameters
    const validatedData = req.validatedData;
    // Convert date strings to Date objects for query
    const filters = {
        page: validatedData.page,
        limit: validatedData.limit,
        sort: validatedData.sort,
        order: validatedData.order,
        ...(validatedData.action && { action: validatedData.action }),
        ...(validatedData.actorType && { actorType: validatedData.actorType }),
        ...(validatedData.actorId && { actorId: validatedData.actorId }),
        ...(validatedData.targetType && { targetType: validatedData.targetType }),
        ...(validatedData.targetId && { targetId: validatedData.targetId }),
        ...(validatedData.tenantId && { tenantId: validatedData.tenantId }),
        ...(validatedData.success !== undefined && {
            success: validatedData.success,
        }),
        ...(validatedData.startDate && {
            startDate: new Date(validatedData.startDate),
        }),
        ...(validatedData.endDate && {
            endDate: new Date(validatedData.endDate),
        }),
    };
    // If user is not SuperAdmin, restrict to their tenant
    const isSuperAdmin = user.role === roles_1.ROLES.SUPERADMIN;
    if (!isSuperAdmin && user.selectedTenantId) {
        filters.tenantId = user.selectedTenantId;
    }
    // Fetch audit logs
    const { logs, total } = await (0, audit_queries_1.findAuditLogs)(filters);
    // Transform audit logs to response format
    const items = logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        targets: log.targets,
        tenantId: log.tenantId,
        context: log.context,
        success: log.success,
        occurredAt: log.occurredAt,
        createdAt: log.createdAt,
    }));
    // Build response data
    const data = {
        items,
        pagination: (0, shared_schema_1.getPaginationMetadata)(filters.page ?? 1, filters.limit ?? 20, total),
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.AUDIT_LOGS_RETRIEVED, data));
});
/**
 * Get audit log by ID controller
 * Retrieves a specific audit log by its ID
 */
exports.getAuditLogById = (0, asyncHandler_1.default)(async (req, res) => {
    const user = req.user;
    // Get validated params
    const { id } = req.params;
    // Fetch audit log
    const auditLog = await (0, audit_queries_1.findAuditLogById)(id);
    if (!auditLog) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.AUDIT_LOG_NOT_FOUND);
    }
    // If user is not SuperAdmin, verify they have access to this tenant
    const isSuperAdmin = user.role === roles_1.ROLES.SUPERADMIN;
    if (!isSuperAdmin && user.selectedTenantId !== auditLog.tenantId) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.FORBIDDEN, errors_1.ERROR_MESSAGES.ACCESS_DENIED);
    }
    // Transform audit log to response format
    const auditLogData = {
        id: auditLog.id,
        action: auditLog.action,
        actor: auditLog.actor,
        targets: auditLog.targets,
        tenantId: auditLog.tenantId,
        context: auditLog.context,
        success: auditLog.success,
        occurredAt: auditLog.occurredAt,
        createdAt: auditLog.createdAt,
    };
    res
        .status(http_1.HTTP_STATUS.OK)
        .json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.AUDIT_LOG_RETRIEVED, auditLogData));
});
/**
 * Get audit logs by target entity controller
 * Retrieves audit logs for a specific target entity
 */
exports.getAuditLogsByTarget = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated params
    const { targetType, targetId } = req.params;
    const limit = Number.parseInt(req.query["limit"] ?? "50", 10);
    // Fetch audit logs
    const logs = await (0, audit_queries_1.findAuditLogsByTarget)(targetType, targetId, Math.min(limit, 100));
    // Transform audit logs to response format
    const items = logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        targets: log.targets,
        tenantId: log.tenantId,
        context: log.context,
        success: log.success,
        occurredAt: log.occurredAt,
        createdAt: log.createdAt,
    }));
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.AUDIT_LOGS_RETRIEVED, {
        items,
    }));
});
/**
 * Get audit logs by actor controller
 * Retrieves audit logs for a specific actor
 */
exports.getAuditLogsByActor = (0, asyncHandler_1.default)(async (req, res) => {
    // Get validated params
    const { actorType, actorId } = req.params;
    const limit = Number.parseInt(req.query["limit"] ?? "50", 10);
    // Fetch audit logs
    const logs = await (0, audit_queries_1.findAuditLogsByActor)(actorType, actorId, Math.min(limit, 100));
    // Transform audit logs to response format
    const items = logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        targets: log.targets,
        tenantId: log.tenantId,
        context: log.context,
        success: log.success,
        occurredAt: log.occurredAt,
        createdAt: log.createdAt,
    }));
    res.status(http_1.HTTP_STATUS.OK).json(new ApiResponse_1.ApiResponse(http_1.HTTP_STATUS.OK, success_1.SUCCESS_MESSAGES.AUDIT_LOGS_RETRIEVED, {
        items,
    }));
});
