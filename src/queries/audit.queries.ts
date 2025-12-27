/**
 * Audit Log Queries
 * Functions for querying audit logs
 */

import type { AuditLogListInput, AuditLogQueryResult } from '@/types/audit.type'
import { AuditLog } from '@models/AuditLog'

// Re-export types for convenience
export type { AuditLogListInput, AuditLogQueryResult } from '@/types/audit.type'

/**
 * Calculate offset for pagination
 */
function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Find audit logs with pagination and filters
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing audit logs array and total count
 */
export const findAuditLogs = async (
  filters: AuditLogListInput
): Promise<AuditLogQueryResult> => {
  const {
    page = 1,
    limit = 20,
    action,
    actorType,
    actorId,
    targetType,
    targetId,
    tenantId,
    success,
    startDate,
    endDate,
    sort = 'occurredAt',
    order = 'desc',
  } = filters

  const offset = calculateOffset(page, limit)

  // Build base query
  let query = AuditLog.query()

  // Apply filters
  if (action) {
    query = query.modify('byAction', action)
  }

  if (actorType) {
    query = query.whereRaw("actor->>'type' = ?", [actorType])
  }

  if (actorId) {
    query = query.whereRaw("actor->>'id' = ?", [actorId])
  }

  if (targetType) {
    query = query.whereRaw(
      "EXISTS (SELECT 1 FROM jsonb_array_elements(targets) AS target WHERE target->>'type' = ?)",
      [targetType]
    )
  }

  if (targetId) {
    query = query.whereRaw(
      "EXISTS (SELECT 1 FROM jsonb_array_elements(targets) AS target WHERE target->>'id' = ?)",
      [targetId]
    )
  }

  if (tenantId) {
    query = query.modify('byTenantId', tenantId)
  }

  if (success !== undefined) {
    query = query.modify('bySuccess', success)
  }

  if (startDate) {
    query = query.where('occurred_at', '>=', startDate)
  }

  if (endDate) {
    query = query.where('occurred_at', '<=', endDate)
  }

  // Get total count before pagination
  const total = await query.resultSize()

  // Apply pagination and sorting
  const sortColumn =
    sort === 'occurredAt'
      ? 'occurred_at'
      : sort === 'createdAt'
        ? 'created_at'
        : 'action'
  const logs = await query
    .orderBy(sortColumn, order)
    .limit(limit)
    .offset(offset)

  return { logs, total }
}

/**
 * Find audit logs for a specific target entity
 * @param targetType - Type of target entity
 * @param targetId - ID of target entity
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of audit logs
 */
export const findAuditLogsByTarget = async (
  targetType: string,
  targetId: string,
  limit: number = 50
): Promise<AuditLog[]> => {
  return AuditLog.query()
    .whereRaw(
      "EXISTS (SELECT 1 FROM jsonb_array_elements(targets) AS target WHERE target->>'type' = ? AND target->>'id' = ?)",
      [targetType, targetId]
    )
    .modify('newestFirst')
    .limit(limit)
}

/**
 * Find audit logs for a specific actor
 * @param actorType - Type of actor (user, system, api_key)
 * @param actorId - ID of actor
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of audit logs
 */
export const findAuditLogsByActor = async (
  actorType: string,
  actorId: string,
  limit: number = 50
): Promise<AuditLog[]> => {
  return AuditLog.query()
    .whereRaw("actor->>'type' = ? AND actor->>'id' = ?", [actorType, actorId])
    .modify('newestFirst')
    .limit(limit)
}

/**
 * Find audit log by ID
 * @param auditLogId - Audit log ID
 * @returns Audit log or undefined
 */
export const findAuditLogById = async (
  auditLogId: string
): Promise<AuditLog | undefined> => {
  return AuditLog.query().findById(auditLogId)
}
