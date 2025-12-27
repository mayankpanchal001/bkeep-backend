import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { Role } from '@models/Role'

/**
 * Permission Model
 * Represents a permission in the RBAC system
 */
export class Permission extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'permissions'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  name!: string
  displayName!: string
  description?: string | null
  isActive!: boolean

  // Relations
  roles?: Array<{
    id: string
    name: string
    displayName: string
    isActive: boolean
  }>

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'displayName'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        displayName: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: ['string', 'null'], maxLength: 1000 },
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
      roles: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: Role,
        join: {
          from: 'permissions.id',
          through: {
            from: 'role_permissions.permission_id',
            to: 'role_permissions.role_id',
            extra: {
              createdAt: 'created_at',
            },
          },
          to: 'roles.id',
        },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with Permission-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only active permissions (is_active = true)
      active(query: QueryBuilder<Permission>) {
        query.where('is_active', true)
      },
      // Only inactive permissions (is_active = false)
      inactive(query: QueryBuilder<Permission>) {
        query.where('is_active', false)
      },
      // Search by name or display name
      search(query: QueryBuilder<Permission>, searchTerm: string) {
        query.where((builder: QueryBuilder<Permission>) => {
          builder
            .where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('display_name', 'ilike', `%${searchTerm}%`)
        })
      },
    }
  }

  /**
   * Scope: Find by name (only active, non-deleted permissions)
   */
  static async findByName(name: string): Promise<Permission | undefined> {
    return this.query().modify('notDeleted').modify('active').findOne({ name })
  }

  /**
   * Scope: Get only active (non-deleted) permissions
   */
  static async findActive(): Promise<Permission[]> {
    return this.query().modify('notDeleted').modify('active')
  }

  /**
   * Scope: Search by term (only active, non-deleted permissions)
   */
  static async search(term: string): Promise<Permission[]> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .modify('search', term)
  }
}
