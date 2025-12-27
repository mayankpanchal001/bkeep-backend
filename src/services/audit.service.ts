/**
 * Audit Service
 * Provides functions to create audit log entries
 */

import type { Request } from 'express'
import type { Knex } from 'knex'

import type {
  AuditActor,
  AuditContext,
  AuditRequestContext,
  AuditTarget,
  CreateAuditLogOptions,
} from '@/types/audit.type'
import type { JwtUser } from '@/types/jwt.type'
import type { AuditAction } from '@constants/audit'
import { AuditLog } from '@models/AuditLog'
import { getCurrentDate, getCurrentISOString } from '@utils/date'

// Re-export for convenience
export type {
  AuditActor,
  AuditContext,
  AuditRequestContext,
  AuditTarget,
  CreateAuditLogOptions,
} from '@/types/audit.type'

/**
 * Extract request context from Express request
 */
export function extractRequestContext(req: Request): AuditRequestContext {
  const authReq = req as Request & { user?: JwtUser }
  const user = authReq.user

  // Get IP address (considering proxies)
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    (req.headers['x-real-ip'] as string) ??
    req.socket.remoteAddress ??
    null

  // Get user agent
  const userAgent = req.headers['user-agent'] ?? null

  // Get tenant ID from user if available
  const tenantId = user?.selectedTenantId ?? null

  // Get request ID if available
  const requestId = (req as Request & { requestId?: string }).requestId ?? null

  return {
    user,
    ipAddress,
    userAgent,
    method: req.method,
    endpoint: req.originalUrl ?? req.url ?? null,
    tenantId,
    requestId,
  }
}

/**
 * Build actor from request context or provided data
 */
function buildActor(
  requestContext?: AuditRequestContext,
  actor?: AuditActor
): AuditActor {
  if (actor) {
    return actor
  }

  const user = requestContext?.user
  if (user) {
    return {
      type: 'user',
      id: user.id,
      email: user.email,
      ...(user.name ? { name: user.name } : {}),
    }
  }

  // System actor as fallback
  return {
    type: 'system',
    id: 'system',
  }
}

/**
 * Build context from request context
 */
function buildContext(requestContext?: AuditRequestContext): AuditContext {
  const context: AuditContext = {}
  if (requestContext?.ipAddress) {
    context.location = requestContext.ipAddress
  }
  if (requestContext?.userAgent) {
    context.userAgent = requestContext.userAgent
  }
  if (requestContext?.method) {
    context.method = requestContext.method
  }
  if (requestContext?.endpoint) {
    context.endpoint = requestContext.endpoint
  }
  if (requestContext?.requestId) {
    context.requestId = requestContext.requestId
  }
  return context
}

/**
 * Create an audit log entry
 * @param options - Audit log options
 * @returns Created audit log entry
 */
export async function createAuditLog(
  options: CreateAuditLogOptions
): Promise<AuditLog> {
  const {
    action,
    actor,
    targets,
    tenantId,
    context,
    success = true,
    occurredAt,
    trx,
  } = options

  // Convert Date to ISO string for JSON schema validation
  // Objection.js JSON schema expects strings, not Date objects
  const occurredAtValue = occurredAt
    ? occurredAt instanceof Date
      ? occurredAt.toISOString()
      : occurredAt
    : getCurrentISOString()

  const auditLogData: Record<string, unknown> = {
    action,
    actor,
    targets,
    tenantId,
    context,
    success,
    occurredAt: occurredAtValue,
  }

  const query = trx ? AuditLog.query(trx) : AuditLog.query()
  // Use type assertion to avoid deep type inference with JSONB fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditLog = await query.insert(auditLogData as any)

  return auditLog
}

/**
 * Helper: Create audit log for entity creation
 */
export async function auditCreate(
  action: AuditAction,
  targetType: string,
  targetId: string,
  options: {
    requestContext?: AuditRequestContext
    actor?: AuditActor
    tenantId: string
    additionalTargets?: AuditTarget[]
    success?: boolean
    metadata?: Record<string, unknown>
    trx?: Knex.Transaction | undefined
  }
): Promise<AuditLog> {
  const targets: AuditTarget[] = [
    { type: targetType, id: targetId, ...(options.metadata ?? {}) },
    ...(options.additionalTargets ?? []),
  ]

  const actor = buildActor(options.requestContext, options.actor)
  const context = buildContext(options.requestContext)

  return createAuditLog({
    action,
    actor,
    targets,
    tenantId: options.tenantId,
    context,
    success: options.success ?? true,
    trx: options.trx,
  })
}

/**
 * Helper: Create audit log for entity update
 */
export async function auditUpdate(
  action: AuditAction,
  targetType: string,
  targetId: string,
  changes: Record<string, { from: unknown; to: unknown }>,
  options: {
    requestContext?: AuditRequestContext
    actor?: AuditActor
    tenantId: string
    additionalTargets?: AuditTarget[]
    success?: boolean
    trx?: Knex.Transaction | undefined
  }
): Promise<AuditLog> {
  const targets: AuditTarget[] = [
    { type: targetType, id: targetId, changes },
    ...(options.additionalTargets ?? []),
  ]

  const actor = buildActor(options.requestContext, options.actor)
  const context = buildContext(options.requestContext)

  return createAuditLog({
    action,
    actor,
    targets,
    tenantId: options.tenantId,
    context,
    success: options.success ?? true,
    trx: options.trx,
  })
}

/**
 * Helper: Create audit log for entity deletion
 */
export async function auditDelete(
  action: AuditAction,
  targetType: string,
  targetId: string,
  options: {
    requestContext?: AuditRequestContext
    actor?: AuditActor
    tenantId: string
    additionalTargets?: AuditTarget[]
    success?: boolean
    metadata?: Record<string, unknown>
    trx?: Knex.Transaction | undefined
  }
): Promise<AuditLog> {
  const targets: AuditTarget[] = [
    { type: targetType, id: targetId, ...(options.metadata ?? {}) },
    ...(options.additionalTargets ?? []),
  ]

  const actor = buildActor(options.requestContext, options.actor)
  const context = buildContext(options.requestContext)

  return createAuditLog({
    action,
    actor,
    targets,
    tenantId: options.tenantId,
    context,
    success: options.success ?? true,
    trx: options.trx,
  })
}

/**
 * Helper: Create audit log for custom action
 */
export async function auditAction(
  action: AuditAction,
  targets: AuditTarget[],
  options: {
    requestContext?: AuditRequestContext
    actor?: AuditActor
    tenantId: string
    context?: AuditContext
    success?: boolean
    occurredAt?: Date
    trx?: Knex.Transaction | undefined
  }
): Promise<AuditLog> {
  const actor = buildActor(options.requestContext, options.actor)
  const context = options.context ?? buildContext(options.requestContext)

  return createAuditLog({
    action,
    actor,
    targets,
    tenantId: options.tenantId,
    context,
    success: options.success ?? true,
    occurredAt: options.occurredAt ?? getCurrentDate(),
    trx: options.trx,
  })
}
