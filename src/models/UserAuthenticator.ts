import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { User } from '@models/User'

/**
 * UserAuthenticator Model
 * Represents TOTP/authenticator app credentials for a user
 * Supports Google Authenticator, Microsoft Authenticator, etc.
 */
export class UserAuthenticator extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'user_authenticators'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  userId!: string
  type!: 'totp'
  secret!: string
  backupCodes?: string | null
  isActive!: boolean
  verifiedAt?: Date | null
  lastUsedAt?: Date | null
  deviceName?: string | null
  userAgent?: string | null
  ipAddress?: string | null

  // Relations
  user?: User

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'type', 'secret'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['totp'] },
        secret: { type: 'string', minLength: 1, maxLength: 500 },
        backupCodes: { type: ['string', 'null'] },
        isActive: { type: 'boolean', default: true },
        verifiedAt: { type: ['string', 'null'], format: 'date-time' },
        lastUsedAt: { type: ['string', 'null'], format: 'date-time' },
        deviceName: { type: ['string', 'null'], maxLength: 255 },
        userAgent: { type: ['string', 'null'], maxLength: 500 },
        ipAddress: { type: ['string', 'null'], maxLength: 45 },
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
          from: 'user_authenticators.user_id',
          to: 'users.id',
        },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with UserAuthenticator-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only active authenticators
      active(query: QueryBuilder<UserAuthenticator>) {
        query.where('is_active', true)
      },
      // Only inactive authenticators
      inactive(query: QueryBuilder<UserAuthenticator>) {
        query.where('is_active', false)
      },
      // Only verified authenticators
      verified(query: QueryBuilder<UserAuthenticator>) {
        query.whereNotNull('verified_at')
      },
      // Only unverified authenticators
      unverified(query: QueryBuilder<UserAuthenticator>) {
        query.whereNull('verified_at')
      },
      // Filter by type
      byType(query: QueryBuilder<UserAuthenticator>, type: 'totp') {
        query.where('type', type)
      },
      // Filter by user ID
      byUser(query: QueryBuilder<UserAuthenticator>, userId: string) {
        query.where('user_id', userId)
      },
    }
  }

  /**
   * Find active authenticator by user ID and type
   * @param userId - User ID
   * @param type - Authenticator type
   * @returns UserAuthenticator or undefined
   */
  static async findActiveByUserAndType(
    userId: string,
    type: 'totp' = 'totp'
  ): Promise<UserAuthenticator | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .modify('verified')
      .modify('byUser', userId)
      .modify('byType', type)
      .first()
  }

  /**
   * Find all authenticators for a user
   * @param userId - User ID
   * @returns Array of UserAuthenticator
   */
  static async findByUser(userId: string): Promise<UserAuthenticator[]> {
    return this.query().modify('notDeleted').modify('byUser', userId)
  }

  /**
   * Check if authenticator is verified
   */
  isVerified(): boolean {
    return !!this.verifiedAt
  }

  /**
   * Check if authenticator is active and verified
   */
  isActiveAndVerified(): boolean {
    return this.isActive && this.isVerified() && !this.isDeleted()
  }
}
