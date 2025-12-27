/**
 * Audit Types
 * Type definitions for audit logging
 */

import type { Knex } from 'knex'

import type { AuditAction } from '@constants/audit'

import type { JwtUser } from './jwt.type'

/**
 * Actor types
 */
export type ActorType = 'user' | 'system' | 'api_key'

/**
 * Actor information - who performed the action
 */
export interface AuditActor {
  type: ActorType
  id: string
  email?: string
  name?: string
}

/**
 * Target entity information - what was affected
 */
export interface AuditTarget {
  type: string
  id: string
  [key: string]: unknown // Additional metadata
}

/**
 * Request context metadata
 */
export interface AuditContext {
  location?: string // IP address or location identifier
  userAgent?: string
  method?: string
  endpoint?: string
  requestId?: string
  sessionId?: string
  [key: string]: unknown // Additional context
}

/**
 * Request context extracted from Express request
 */
export interface AuditRequestContext {
  user?: JwtUser | undefined
  ipAddress?: string | null | undefined
  userAgent?: string | null | undefined
  method?: string | null | undefined
  endpoint?: string | null | undefined
  tenantId?: string | null | undefined
  requestId?: string | null | undefined
  sessionId?: string | null | undefined
}

/**
 * Options for creating an audit log entry
 */
export interface CreateAuditLogOptions {
  action: AuditAction
  actor: AuditActor
  targets: AuditTarget[]
  tenantId: string
  context: AuditContext
  success?: boolean
  occurredAt?: Date
  trx?: Knex.Transaction | undefined
}

/**
 * Interface for audit log list filters
 */
export interface AuditLogListInput {
  page?: number
  limit?: number
  action?: AuditAction
  actorType?: ActorType
  actorId?: string
  targetType?: string
  targetId?: string
  tenantId?: string
  success?: boolean
  startDate?: Date
  endDate?: Date
  sort?: 'occurredAt' | 'createdAt' | 'action'
  order?: 'asc' | 'desc'
}

/**
 * Interface for audit log query result
 */
export interface AuditLogQueryResult {
  logs: Array<{
    id: string
    action: AuditAction
    actor: AuditActor
    targets: AuditTarget[]
    tenantId: string
    context: AuditContext
    success: boolean
    occurredAt: Date
    createdAt: Date
  }>
  total: number
}
