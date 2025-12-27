import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { Permission } from '@models/Permission'
import { User } from '@models/User'

/**
 * Role Model
 * Represents a role in the RBAC system
 */
export class Role extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'roles'
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
  permissions?: Array<{
    id: string
    name: string
    displayName: string
    isActive: boolean
  }>
  users?: Array<{
    id: string
    name: string
    email: string
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
      permissions: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: Permission,
        join: {
          from: 'roles.id',
          through: {
            from: 'role_permissions.role_id',
            to: 'role_permissions.permission_id',
            extra: {
              createdAt: 'created_at',
            },
          },
          to: 'permissions.id',
        },
      },
      users: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'roles.id',
          through: {
            from: 'user_roles.role_id',
            to: 'user_roles.user_id',
            extra: {
              tenantId: 'tenant_id',
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
   * Extends BaseModel modifiers with Role-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only active roles (is_active = true)
      active(query: QueryBuilder<Role>) {
        query.where('is_active', true)
      },
      // Only inactive roles (is_active = false)
      inactive(query: QueryBuilder<Role>) {
        query.where('is_active', false)
      },
      // Search by name or display name
      search(query: QueryBuilder<Role>, searchTerm: string) {
        query.where((builder: QueryBuilder<Role>) => {
          builder
            .where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('display_name', 'ilike', `%${searchTerm}%`)
        })
      },
    }
  }

  /**
   * Scope: Find by name (only active, non-deleted roles)
   */
  static async findByName(name: string): Promise<Role | undefined> {
    return this.query().modify('notDeleted').modify('active').findOne({ name })
  }

  /**
   * Scope: Get only active (non-deleted) roles
   */
  static async findActive(): Promise<Role[]> {
    return this.query().modify('notDeleted').modify('active')
  }

  /**
   * Scope: Search by term (only active, non-deleted roles)
   */
  static async search(term: string): Promise<Role[]> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .modify('search', term)
  }

  /**
   * Attach a permission to this role
   */
  async attachPermission(permissionId: string): Promise<void> {
    await this.$relatedQuery('permissions').relate(permissionId)
  }

  /**
   * Detach a permission from this role
   */
  async detachPermission(permissionId: string): Promise<void> {
    await this.$relatedQuery('permissions')
      .unrelate()
      .where('permissions.id', permissionId)
  }

  /**
   * Sync permissions (replace all permissions with the given ones)
   */
  async syncPermissions(permissionIds: string[]): Promise<void> {
    await this.$relatedQuery('permissions').unrelate()
    if (permissionIds.length > 0) {
      await this.$relatedQuery('permissions').relate(permissionIds)
    }
  }
}
