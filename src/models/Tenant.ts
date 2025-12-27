import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { User } from '@models/User'

/**
 * Tenant Model
 * Represents a tenant in a multi-tenant schema-based architecture
 * Each tenant has its own database schema
 */
export class Tenant extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'tenants'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  name!: string
  schemaName!: string
  isActive!: boolean

  // Relations
  users?: Array<{
    id: string
    name: string
    email: string
    isVerified: boolean
  }>

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'schemaName'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        schemaName: {
          type: 'string',
          minLength: 1,
          maxLength: 63, // PostgreSQL schema name limit
          pattern: '^[a-z][a-z0-9_]*$', // Lowercase, alphanumeric, underscore
        },
        isActive: { type: 'boolean', default: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  /**
   * Relations
   */
  static override get relationMappings() {
    return {
      users: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'tenants.id',
          through: {
            from: 'user_tenants.tenant_id',
            to: 'user_tenants.user_id',
            extra: {
              isPrimary: 'is_primary',
              createdAt: 'created_at',
            },
          },
          to: 'users.id',
        },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with Tenant-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Search by name or schema name
      search(query: QueryBuilder<Tenant>, searchTerm: string) {
        query.where((builder: QueryBuilder<Tenant>) => {
          builder
            .where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('schema_name', 'ilike', `%${searchTerm}%`)
        })
      },
      // Only active tenants (is_active = true)
      active(query: QueryBuilder<Tenant>) {
        query.where('is_active', true)
      },
      // Only inactive tenants (is_active = false)
      inactive(query: QueryBuilder<Tenant>) {
        query.where('is_active', false)
      },
    }
  }

  /**
   * Scope: Find by schema name (only active, non-deleted tenants)
   */
  static async findBySchemaName(
    schemaName: string
  ): Promise<Tenant | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .where('schema_name', schemaName)
      .first()
  }

  /**
   * Scope: Search by term (only active, non-deleted tenants)
   */
  static async search(term: string): Promise<Tenant[]> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .modify('search', term)
  }

  /**
   * Scope: Get only active (non-deleted) tenants
   */
  static async findActive(): Promise<Tenant[]> {
    return this.query().modify('notDeleted').modify('active')
  }

  /**
   * Get the full schema name (with tenant_ prefix if needed)
   */
  getFullSchemaName(): string {
    // Ensure schema name follows tenant_ prefix pattern
    if (this.schemaName.startsWith('tenant_')) {
      return this.schemaName
    }
    return `tenant_${this.schemaName}`
  }

  /**
   * Validate schema name format
   */
  static validateSchemaName(schemaName: string): boolean {
    // PostgreSQL schema name rules:
    // - Must start with letter or underscore
    // - Can contain letters, digits, underscores
    // - Max 63 characters
    // - Lowercase recommended
    const schemaNameRegex = /^[a-z][\d_a-z]{0,62}$/
    return schemaNameRegex.test(schemaName.toLowerCase())
  }
}
