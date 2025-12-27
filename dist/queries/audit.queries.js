"use strict";
/**
 * Audit Log Queries
 * Functions for querying audit logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAuditLogById = exports.findAuditLogsByActor = exports.findAuditLogsByTarget = exports.findAuditLogs = void 0;
const AuditLog_1 = require("../models/AuditLog");
/**
 * Calculate offset for pagination
 */
function calculateOffset(page, limit) {
    return (page - 1) * limit;
}
/**
 * Find audit logs with pagination and filters
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing audit logs array and total count
 */
const findAuditLogs = async (filters) => {
    const { page = 1, limit = 20, action, actorType, actorId, targetType, targetId, tenantId, success, startDate, endDate, sort = "occurredAt", order = "desc", } = filters;
    const offset = calculateOffset(page, limit);
    // Build base query
    let query = AuditLog_1.AuditLog.query();
    // Apply filters
    if (action) {
        query = query.modify("byAction", action);
    }
    if (actorType) {
        query = query.whereRaw("actor->>'type' = ?", [actorType]);
    }
    if (actorId) {
        query = query.whereRaw("actor->>'id' = ?", [actorId]);
    }
    if (targetType) {
        query = query.whereRaw("EXISTS (SELECT 1 FROM jsonb_array_elements(targets) AS target WHERE target->>'type' = ?)", [targetType]);
    }
    if (targetId) {
        query = query.whereRaw("EXISTS (SELECT 1 FROM jsonb_array_elements(targets) AS target WHERE target->>'id' = ?)", [targetId]);
    }
    if (tenantId) {
        query = query.modify("byTenantId", tenantId);
    }
    if (success !== undefined) {
        query = query.modify("bySuccess", success);
    }
    if (startDate) {
        query = query.where("occurred_at", ">=", startDate);
    }
    if (endDate) {
        query = query.where("occurred_at", "<=", endDate);
    }
    // Get total count before pagination
    const total = await query.resultSize();
    // Apply pagination and sorting
    const sortColumn = sort === "occurredAt"
        ? "occurred_at"
        : sort === "createdAt"
            ? "created_at"
            : "action";
    const logs = await query
        .orderBy(sortColumn, order)
        .limit(limit)
        .offset(offset);
    return { logs, total };
};
exports.findAuditLogs = findAuditLogs;
/**
 * Find audit logs for a specific target entity
 * @param targetType - Type of target entity
 * @param targetId - ID of target entity
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of audit logs
 */
const findAuditLogsByTarget = async (targetType, targetId, limit = 50) => {
    return AuditLog_1.AuditLog.query()
        .whereRaw("EXISTS (SELECT 1 FROM jsonb_array_elements(targets) AS target WHERE target->>'type' = ? AND target->>'id' = ?)", [targetType, targetId])
        .modify("newestFirst")
        .limit(limit);
};
exports.findAuditLogsByTarget = findAuditLogsByTarget;
/**
 * Find audit logs for a specific actor
 * @param actorType - Type of actor (user, system, api_key)
 * @param actorId - ID of actor
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of audit logs
 */
const findAuditLogsByActor = async (actorType, actorId, limit = 50) => {
    return AuditLog_1.AuditLog.query()
        .whereRaw("actor->>'type' = ? AND actor->>'id' = ?", [actorType, actorId])
        .modify("newestFirst")
        .limit(limit);
};
exports.findAuditLogsByActor = findAuditLogsByActor;
/**
 * Find audit log by ID
 * @param auditLogId - Audit log ID
 * @returns Audit log or undefined
 */
const findAuditLogById = async (auditLogId) => {
    return AuditLog_1.AuditLog.query().findById(auditLogId);
};
exports.findAuditLogById = findAuditLogById;
