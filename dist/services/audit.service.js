"use strict";
/**
 * Audit Service
 * Provides functions to create audit log entries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRequestContext = extractRequestContext;
exports.createAuditLog = createAuditLog;
exports.auditCreate = auditCreate;
exports.auditUpdate = auditUpdate;
exports.auditDelete = auditDelete;
exports.auditAction = auditAction;
const AuditLog_1 = require("../models/AuditLog");
const date_1 = require("../utils/date");
/**
 * Extract request context from Express request
 */
function extractRequestContext(req) {
    const authReq = req;
    const user = authReq.user;
    // Get IP address (considering proxies)
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
        req.headers["x-real-ip"] ??
        req.socket.remoteAddress ??
        null;
    // Get user agent
    const userAgent = req.headers["user-agent"] ?? null;
    // Get tenant ID from user if available
    const tenantId = user?.selectedTenantId ?? null;
    // Get request ID if available
    const requestId = req.requestId ?? null;
    return {
        user,
        ipAddress,
        userAgent,
        method: req.method,
        endpoint: req.originalUrl ?? req.url ?? null,
        tenantId,
        requestId,
    };
}
/**
 * Build actor from request context or provided data
 */
function buildActor(requestContext, actor) {
    if (actor) {
        return actor;
    }
    const user = requestContext?.user;
    if (user) {
        return {
            type: "user",
            id: user.id,
            email: user.email,
            ...(user.name ? { name: user.name } : {}),
        };
    }
    // System actor as fallback
    return {
        type: "system",
        id: "system",
    };
}
/**
 * Build context from request context
 */
function buildContext(requestContext) {
    const context = {};
    if (requestContext?.ipAddress) {
        context.location = requestContext.ipAddress;
    }
    if (requestContext?.userAgent) {
        context.userAgent = requestContext.userAgent;
    }
    if (requestContext?.method) {
        context.method = requestContext.method;
    }
    if (requestContext?.endpoint) {
        context.endpoint = requestContext.endpoint;
    }
    if (requestContext?.requestId) {
        context.requestId = requestContext.requestId;
    }
    return context;
}
/**
 * Create an audit log entry
 * @param options - Audit log options
 * @returns Created audit log entry
 */
async function createAuditLog(options) {
    const { action, actor, targets, tenantId, context, success = true, occurredAt, trx, } = options;
    // Convert Date to ISO string for JSON schema validation
    // Objection.js JSON schema expects strings, not Date objects
    const occurredAtValue = occurredAt
        ? occurredAt instanceof Date
            ? occurredAt.toISOString()
            : occurredAt
        : (0, date_1.getCurrentISOString)();
    const auditLogData = {
        action,
        actor,
        targets,
        tenantId,
        context,
        success,
        occurredAt: occurredAtValue,
    };
    const query = trx ? AuditLog_1.AuditLog.query(trx) : AuditLog_1.AuditLog.query();
    // Use type assertion to avoid deep type inference with JSONB fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditLog = await query.insert(auditLogData);
    return auditLog;
}
/**
 * Helper: Create audit log for entity creation
 */
async function auditCreate(action, targetType, targetId, options) {
    const targets = [
        { type: targetType, id: targetId, ...(options.metadata ?? {}) },
        ...(options.additionalTargets ?? []),
    ];
    const actor = buildActor(options.requestContext, options.actor);
    const context = buildContext(options.requestContext);
    return createAuditLog({
        action,
        actor,
        targets,
        tenantId: options.tenantId,
        context,
        success: options.success ?? true,
        trx: options.trx,
    });
}
/**
 * Helper: Create audit log for entity update
 */
async function auditUpdate(action, targetType, targetId, changes, options) {
    const targets = [
        { type: targetType, id: targetId, changes },
        ...(options.additionalTargets ?? []),
    ];
    const actor = buildActor(options.requestContext, options.actor);
    const context = buildContext(options.requestContext);
    return createAuditLog({
        action,
        actor,
        targets,
        tenantId: options.tenantId,
        context,
        success: options.success ?? true,
        trx: options.trx,
    });
}
/**
 * Helper: Create audit log for entity deletion
 */
async function auditDelete(action, targetType, targetId, options) {
    const targets = [
        { type: targetType, id: targetId, ...(options.metadata ?? {}) },
        ...(options.additionalTargets ?? []),
    ];
    const actor = buildActor(options.requestContext, options.actor);
    const context = buildContext(options.requestContext);
    return createAuditLog({
        action,
        actor,
        targets,
        tenantId: options.tenantId,
        context,
        success: options.success ?? true,
        trx: options.trx,
    });
}
/**
 * Helper: Create audit log for custom action
 */
async function auditAction(action, targets, options) {
    const actor = buildActor(options.requestContext, options.actor);
    const context = options.context ?? buildContext(options.requestContext);
    return createAuditLog({
        action,
        actor,
        targets,
        tenantId: options.tenantId,
        context,
        success: options.success ?? true,
        occurredAt: options.occurredAt ?? (0, date_1.getCurrentDate)(),
        trx: options.trx,
    });
}
