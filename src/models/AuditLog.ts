import type { QueryBuilder } from 'objection'
import { Model, snakeCaseMappers } from 'objection'
import { v4 as uuidv4 } from 'uuid'

import type { AuditActor, AuditContext, AuditTarget } from '@/types/audit.type'
import type { AuditAction } from '@constants/audit'
import { getCurrentDate } from '@utils/date'

export type { AuditAction } from '@constants/audit'

/**
 * AuditLog Model
 * Represents an audit trail entry for system operations
 */
export class AuditLog extends Model {
  // Table name
  static override get tableName(): string {
    return 'audit_logs'
  }

  // Model properties
  id!: string
  action!: AuditAction
  actor!: AuditActor
  targets!: AuditTarget[]
  tenantId!: string
  context!: AuditContext
  success!: boolean
  occurredAt!: Date
  createdAt!: Date

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: [
        'action',
        'actor',
        'targets',
        'tenantId',
        'context',
        'success',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        action: {
          type: 'string',
          // Supports both enum values and namespaced string actions (e.g., 'user.logged_in')
        },
        actor: {
          type: 'object',
          required: ['type', 'id'],
          properties: {
            type: { type: 'string', enum: ['user', 'system', 'api_key'] },
            id: { type: 'string' },
            email: { type: ['string', 'null'] },
            name: { type: ['string', 'null'] },
          },
        },
        targets: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'id'],
            properties: {
              type: { type: 'string' },
              id: { type: 'string' },
            },
          },
        },
        tenantId: { type: 'string', format: 'uuid' },
        context: { type: 'object' },
        success: { type: 'boolean' },
        occurredAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    }
  }

  /**
   * Map JS camelCase properties <-> DB snake_case columns
   */
  static override get columnNameMappers() {
    return snakeCaseMappers()
  }

  /**
   * Before insert hook → set UUID and timestamps
   */
  override $beforeInsert(): void {
    if (!this.id) this.id = uuidv4()
    const now = getCurrentDate()
    if (!this.createdAt) {
      this.createdAt = now
    }
    if (!this.occurredAt) {
      this.occurredAt = now
    }
    // Convert Date objects to ISO strings for JSON schema validation
    // Objection.js JSON schema expects strings, but will convert back to Date when reading
    if (this.createdAt instanceof Date) {
      this.createdAt = this.createdAt.toISOString() as unknown as Date
    }
    if (this.occurredAt instanceof Date) {
      this.occurredAt = this.occurredAt.toISOString() as unknown as Date
    }
  }

  /**
   * Query builder modifiers
   */
  static override get modifiers() {
    return {
      // Filter by action
      byAction(query: QueryBuilder<AuditLog>, action: AuditAction) {
        query.where('action', action)
      },
      // Filter by tenant ID
      byTenantId(query: QueryBuilder<AuditLog>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
      // Filter by success status
      bySuccess(query: QueryBuilder<AuditLog>, success: boolean) {
        query.where('success', success)
      },
      // Order by occurred date (newest first)
      newestFirst(query: QueryBuilder<AuditLog>) {
        query.orderBy('occurred_at', 'desc')
      },
      // Order by occurred date (oldest first)
      oldestFirst(query: QueryBuilder<AuditLog>) {
        query.orderBy('occurred_at', 'asc')
      },
    }
  }
}
