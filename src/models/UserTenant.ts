import { Model, snakeCaseMappers } from 'objection'

import { Tenant } from '@models/Tenant'
import { User } from '@models/User'
import { getCurrentDate } from '@utils/date'

/**
 * UserTenant Model
 * Represents the many-to-many relationship between users and tenants
 * This is a pivot table with composite primary key (user_id + tenant_id)
 */
export class UserTenant extends Model {
  // Table name
  static override get tableName(): string {
    return 'user_tenants'
  }

  // Model properties
  userId!: string
  tenantId!: string
  isPrimary!: boolean
  createdAt!: Date

  // Relations
  user?: User
  tenant?: Tenant

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'tenantId', 'isPrimary'],
      properties: {
        userId: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        isPrimary: { type: 'boolean', default: false },
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
   * Composite primary key
   */
  static override get idColumn() {
    return ['user_id', 'tenant_id']
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
          from: 'user_tenants.user_id',
          to: 'users.id',
        },
      },
      tenant: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tenant,
        join: {
          from: 'user_tenants.tenant_id',
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
   * Find user-tenant relationship
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns UserTenant or undefined
   */
  static async findByUserAndTenant(
    userId: string,
    tenantId: string
  ): Promise<UserTenant | undefined> {
    return this.query()
      .where('user_id', userId)
      .where('tenant_id', tenantId)
      .first()
  }

  /**
   * Find all tenants for a user
   * @param userId - User ID
   * @returns Array of UserTenant with tenant details
   */
  static async findByUser(userId: string): Promise<UserTenant[]> {
    return this.query().where('user_id', userId).withGraphFetched('tenant')
  }

  /**
   * Find all users in a tenant
   * @param tenantId - Tenant ID
   * @returns Array of UserTenant with user details
   */
  static async findByTenant(tenantId: string): Promise<UserTenant[]> {
    return this.query().where('tenant_id', tenantId).withGraphFetched('user')
  }

  /**
   * Check if user is member of tenant
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns boolean
   */
  static async isMember(userId: string, tenantId: string): Promise<boolean> {
    const userTenant = await this.findByUserAndTenant(userId, tenantId)
    return !!userTenant
  }

  /**
   * Add user to tenant
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param isPrimary - Whether this is the primary tenant (default: false)
   * @returns Created UserTenant
   */
  static async addUserToTenant(
    userId: string,
    tenantId: string,
    isPrimary = false
  ): Promise<UserTenant> {
    // Check if relationship already exists
    const existing = await this.findByUserAndTenant(userId, tenantId)

    if (existing) {
      // Update isPrimary if needed
      if (existing.isPrimary !== isPrimary) {
        return this.query().patchAndFetchById([userId, tenantId], { isPrimary })
      }
      return existing
    }

    // Create new relationship
    return this.query().insert({
      userId,
      tenantId,
      isPrimary,
    })
  }

  /**
   * Remove user from tenant
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns Number of deleted rows
   */
  static async removeUserFromTenant(
    userId: string,
    tenantId: string
  ): Promise<number> {
    return this.query()
      .delete()
      .where('user_id', userId)
      .where('tenant_id', tenantId)
  }

  /**
   * Set primary tenant for user
   * @param userId - User ID
   * @param tenantId - Tenant ID
   */
  static async setPrimaryTenant(
    userId: string,
    tenantId: string
  ): Promise<void> {
    // First, unset all primary flags for this user
    await this.query().where('user_id', userId).patch({ isPrimary: false })

    // Then set the specified tenant as primary
    await this.query()
      .where('user_id', userId)
      .where('tenant_id', tenantId)
      .patch({ isPrimary: true })
  }

  /**
   * Get user's primary tenant
   * @param userId - User ID
   * @returns UserTenant with tenant details or undefined
   */
  static async getPrimaryTenant(
    userId: string
  ): Promise<UserTenant | undefined> {
    return this.query()
      .where('user_id', userId)
      .where('is_primary', true)
      .withGraphFetched('tenant')
      .first()
  }

  /**
   * Get pivot data (is_primary flag) for a user-tenant relationship
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns Object with isPrimary flag or undefined
   */
  static async getPivotData(
    userId: string,
    tenantId: string
  ): Promise<{ isPrimary: boolean } | undefined> {
    const userTenant = await this.findByUserAndTenant(userId, tenantId)
    return userTenant ? { isPrimary: userTenant.isPrimary } : undefined
  }

  /**
   * Remove all users from a tenant (used during tenant cleanup)
   * @param tenantId - Tenant ID
   * @returns Number of deleted rows
   */
  static async removeAllUsersFromTenant(tenantId: string): Promise<number> {
    return this.query().delete().where('tenant_id', tenantId)
  }

  /**
   * Remove user from all tenants (used during user cleanup)
   * @param userId - User ID
   * @returns Number of deleted rows
   */
  static async removeUserFromAllTenants(userId: string): Promise<number> {
    return this.query().delete().where('user_id', userId)
  }
}
