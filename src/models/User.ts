import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { Role } from '@models/Role'
import { Tenant } from '@models/Tenant'

/**
 * User Model
 * Represents a user account in the system
 */
export class User extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'users'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  name!: string
  email!: string
  passwordHash!: string
  isVerified!: boolean
  verifiedAt?: Date | null
  isActive!: boolean
  mfaEnabled!: boolean
  lastLoggedInAt?: Date | null

  // Relations
  tenants?: Array<{
    id: string
    name: string
    schemaName: string
    isActive: boolean
    userTenants?: {
      isPrimary: boolean
      createdAt: Date
    }
  }>
  roles?: Array<{
    id: string
    name: string
    displayName: string
    permissions?: Array<{
      id: string
      name: string
      displayName: string
      isActive: boolean
      deletedAt?: Date | null
    }>
  }>

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'email', 'passwordHash'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        passwordHash: { type: 'string', minLength: 1, maxLength: 255 },
        isVerified: { type: 'boolean', default: false },
        verifiedAt: { type: ['string', 'null'], format: 'date-time' },
        isActive: { type: 'boolean', default: true },
        mfaEnabled: { type: 'boolean', default: false },
        lastLoggedInAt: { type: ['string', 'null'], format: 'date-time' },
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
      tenants: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: Tenant,
        join: {
          from: 'users.id',
          through: {
            from: 'user_tenants.user_id',
            to: 'user_tenants.tenant_id',
            extra: {
              isPrimary: 'is_primary',
              createdAt: 'created_at',
            },
          },
          to: 'tenants.id',
        },
      },
      roles: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: Role,
        join: {
          from: 'users.id',
          through: {
            from: 'user_roles.user_id',
            to: 'user_roles.role_id',
            extra: {
              tenantId: 'tenant_id',
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
   * Extends BaseModel modifiers with User-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only verified users
      verified(query: QueryBuilder<User>) {
        query.where('is_verified', true)
      },
      // Only unverified users
      unverified(query: QueryBuilder<User>) {
        query.where('is_verified', false)
      },
      // Only active users (is_active = true)
      active(query: QueryBuilder<User>) {
        query.where('is_active', true)
      },
      // Only inactive users (is_active = false)
      inactive(query: QueryBuilder<User>) {
        query.where('is_active', false)
      },
      // Search by name or email
      search(query: QueryBuilder<User>, searchTerm: string) {
        query.where((builder: QueryBuilder<User>) => {
          builder
            .where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('email', 'ilike', `%${searchTerm}%`)
        })
      },
    }
  }

  /**
   * Scope: Find by email (only active, non-deleted users)
   */
  static async findByEmail(email: string): Promise<User | undefined> {
    return this.query().modify('notDeleted').findOne({ email })
  }

  /**
   * Scope: Find verified users
   */
  static async findVerified(): Promise<User[]> {
    return this.query().modify('notDeleted').modify('verified')
  }

  /**
   * Scope: Search by term (only active, non-deleted users)
   */
  static async search(term: string): Promise<User[]> {
    return this.query().modify('notDeleted').modify('search', term)
  }

  /**
   * Get primary tenant for this user
   * @returns Primary tenant or undefined if no tenant exists
   */
  async getPrimaryTenant(): Promise<Tenant | undefined> {
    const tenants = (await this.$relatedQuery('tenants')
      .where('user_tenants.is_primary', true)
      .limit(1)) as Tenant[]

    return tenants[0]
  }

  /**
   * Scope: Find users by tenant
   */
  static async findByTenant(tenantId: string): Promise<User[]> {
    return this.query()
      .modify('notDeleted')
      .join('user_tenants', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    permissionName: string,
    tenantId?: string
  ): Promise<boolean> {
    const roles = await this.$relatedQuery('roles')
      .modify('notDeleted')
      .modify('active')
      .where((builder: QueryBuilder<Role>) => {
        if (tenantId) {
          builder.where('user_roles.tenant_id', tenantId)
        }
      })
      .withGraphFetched('permissions')

    for (const role of roles) {
      if (role.permissions) {
        const hasPermission = role.permissions.some(
          (perm) =>
            perm.name === permissionName && perm.isActive && !perm.deletedAt
        )
        if (hasPermission) return true
      }
    }

    return false
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(roleName: string, tenantId?: string): Promise<boolean> {
    const baseQuery = this.$relatedQuery('roles')
      .modify('notDeleted')
      .modify('active')
      .where('roles.name', roleName)

    const query = tenantId
      ? baseQuery.where('user_roles.tenant_id', tenantId)
      : baseQuery

    const count = await query.resultSize()
    return count > 0
  }
}
