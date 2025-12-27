import { Model, snakeCaseMappers } from 'objection'

import { Role } from '@models/Role'
import { Tenant } from '@models/Tenant'
import { User } from '@models/User'
import { getCurrentDate } from '@utils/date'

/**
 * UserRole Model
 * Represents the many-to-many relationship between users, roles, and tenants
 * This is a pivot table with composite primary key (user_id + role_id + tenant_id)
 * A user can have different roles in different tenants
 */
export class UserRole extends Model {
  // Table name
  static override get tableName(): string {
    return 'user_roles'
  }

  // Model properties
  userId!: string
  roleId!: string
  tenantId!: string
  createdAt!: Date

  // Relations
  user?: User
  role?: Role
  tenant?: Tenant

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'roleId', 'tenantId'],
      properties: {
        userId: { type: 'string', format: 'uuid' },
        roleId: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
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
   * Composite primary key (user_id + role_id + tenant_id)
   */
  static override get idColumn() {
    return ['user_id', 'role_id', 'tenant_id']
  }

  /**
   * Relation mappings
   */
  static override get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user_roles.user_id',
          to: 'users.id',
        },
      },
      role: {
        relation: Model.BelongsToOneRelation,
        modelClass: Role,
        join: {
          from: 'user_roles.role_id',
          to: 'roles.id',
        },
      },
      tenant: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tenant,
        join: {
          from: 'user_roles.tenant_id',
          to: 'tenants.id',
        },
      },
    }
  }

  /**
   * Before insert hook → set timestamp
   */
  override $beforeInsert(): void {
    if (!this.createdAt) {
      this.createdAt = getCurrentDate()
    }
  }

  /**
   * Find user roles by tenant
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns Array of UserRole with role details
   */
  static async findByUserAndTenant(
    userId: string,
    tenantId: string
  ): Promise<UserRole[]> {
    return this.query()
      .where('user_id', userId)
      .where('tenant_id', tenantId)
      .withGraphFetched('role')
  }

  /**
   * Find users by role and tenant
   * @param roleId - Role ID
   * @param tenantId - Tenant ID
   * @returns Array of UserRole with user details
   */
  static async findByRoleAndTenant(
    roleId: string,
    tenantId: string
  ): Promise<UserRole[]> {
    return this.query()
      .where('role_id', roleId)
      .where('tenant_id', tenantId)
      .withGraphFetched('user')
  }

  /**
   * Find all roles for a user across all tenants
   * @param userId - User ID
   * @returns Array of UserRole with role and tenant details
   */
  static async findByUser(userId: string): Promise<UserRole[]> {
    return this.query()
      .where('user_id', userId)
      .withGraphFetched('[role, tenant]')
  }

  /**
   * Check if a user has a specific role in a tenant
   * @param userId - User ID
   * @param roleId - Role ID
   * @param tenantId - Tenant ID
   * @returns boolean
   */
  static async hasRole(
    userId: string,
    roleId: string,
    tenantId: string
  ): Promise<boolean> {
    const userRole = await this.query()
      .where('user_id', userId)
      .where('role_id', roleId)
      .where('tenant_id', tenantId)
      .first()

    return !!userRole
  }

  /**
   * Assign a role to a user in a tenant
   * @param userId - User ID
   * @param roleId - Role ID
   * @param tenantId - Tenant ID
   * @returns Created UserRole
   */
  static async assignRole(
    userId: string,
    roleId: string,
    tenantId: string
  ): Promise<UserRole> {
    // Check if assignment already exists
    const existing = await this.query()
      .where('user_id', userId)
      .where('role_id', roleId)
      .where('tenant_id', tenantId)
      .first()

    if (existing) {
      return existing
    }

    // Create new assignment
    return this.query().insert({
      userId,
      roleId,
      tenantId,
    })
  }

  /**
   * Remove a role from a user in a tenant
   * @param userId - User ID
   * @param roleId - Role ID
   * @param tenantId - Tenant ID
   * @returns Number of deleted rows
   */
  static async removeRole(
    userId: string,
    roleId: string,
    tenantId: string
  ): Promise<number> {
    return this.query()
      .delete()
      .where('user_id', userId)
      .where('role_id', roleId)
      .where('tenant_id', tenantId)
  }

  /**
   * Remove all roles from a user in a tenant
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns Number of deleted rows
   */
  static async removeAllUserRolesInTenant(
    userId: string,
    tenantId: string
  ): Promise<number> {
    return this.query()
      .delete()
      .where('user_id', userId)
      .where('tenant_id', tenantId)
  }

  /**
   * Sync user roles in a tenant (replace all roles with the given ones)
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param roleIds - Array of role IDs to assign
   */
  static async syncUserRolesInTenant(
    userId: string,
    tenantId: string,
    roleIds: string[]
  ): Promise<void> {
    // Remove all existing roles for this user in this tenant
    await this.removeAllUserRolesInTenant(userId, tenantId)

    // Assign new roles
    if (roleIds.length > 0) {
      const userRoles = roleIds.map((roleId) => ({
        userId,
        roleId,
        tenantId,
      }))
      await this.query().insert(userRoles)
    }
  }
}
