import { BaseModel } from '@models/BaseModel'
import { Tenant } from '@models/Tenant'
import { User } from '@models/User'

/**
 * UserInvitation Model
 * Represents a user invitation for a specific tenant
 */
export class UserInvitation extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'user_invitations'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  userId!: string
  tenantId!: string
  invitedBy!: string
  roleId!: string
  token!: string

  // Relations
  user?: {
    id: string
    name: string
    email: string
  }
  tenant?: {
    id: string
    name: string
    schemaName: string
    isActive: boolean
  }

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'tenantId', 'invitedBy', 'roleId', 'token'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        invitedBy: { type: 'string', format: 'uuid' },
        roleId: { type: 'string', format: 'uuid' },
        token: { type: 'string', minLength: 1, maxLength: 255 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  /**
   * Relation mappings
   */
  static override get relationMappings() {
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user_invitations.user_id',
          to: 'users.id',
        },
      },
      tenant: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Tenant,
        join: {
          from: 'user_invitations.tenant_id',
          to: 'tenants.id',
        },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with UserInvitation-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
    }
  }

  /**
   * Scope: Find by token (only valid, non-deleted invitations)
   */
  static async findByToken(token: string): Promise<UserInvitation | undefined> {
    return this.query()
      .modify('notDeleted')
      .findOne({ token })
      .withGraphFetched('[user, tenant]')
  }

  /**
   * Scope: Find by user and tenant (only valid, non-deleted invitations)
   */
  static async findByUserAndTenant(
    userId: string,
    tenantId: string
  ): Promise<UserInvitation | undefined> {
    return this.query()
      .modify('notDeleted')
      .findOne({ user_id: userId, tenant_id: tenantId })
      .withGraphFetched('[user, tenant]')
  }

  /**
   * Scope: Find by user (only valid, non-deleted invitations)
   */
  static async findByUser(userId: string): Promise<UserInvitation[]> {
    return this.query()
      .modify('notDeleted')
      .where({ user_id: userId })
      .withGraphFetched('[user, tenant]')
  }

  /**
   * Scope: Find by tenant (only valid, non-deleted invitations)
   */
  static async findByTenant(tenantId: string): Promise<UserInvitation[]> {
    return this.query()
      .modify('notDeleted')
      .where({ tenant_id: tenantId })
      .withGraphFetched('[user, tenant]')
  }
}
