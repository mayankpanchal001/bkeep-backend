import moment from 'moment'
import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { User } from '@models/User'
import { getCurrentDate, getCurrentISOString } from '@utils/date'

/**
 * RefreshToken Model
 * Represents a refresh token for JWT authentication
 */
export class RefreshToken extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'refresh_tokens'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  userId!: string
  token!: string
  expiresAt!: Date
  userAgent?: string | null
  ipAddress?: string | null

  // Relations
  user?: User

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'token', 'expiresAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        token: { type: 'string', minLength: 1 },
        expiresAt: { type: 'string', format: 'date-time' },
        userAgent: { type: ['string', 'null'], maxLength: 500 },
        ipAddress: { type: ['string', 'null'], maxLength: 45 },
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
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'refresh_tokens.user_id',
          to: 'users.id',
        },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with RefreshToken-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only non-expired tokens
      notExpired(query: QueryBuilder<RefreshToken>) {
        query.where('expires_at', '>', getCurrentDate())
      },
      // Only expired tokens
      expired(query: QueryBuilder<RefreshToken>) {
        query.where('expires_at', '<=', getCurrentDate())
      },
    }
  }

  /**
   * Scope: Find by token (only valid, non-expired tokens)
   */
  static async findByToken(token: string): Promise<RefreshToken | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .findOne({ token })
  }

  /**
   * Scope: Find by user ID (only valid, non-expired tokens)
   */
  static async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .where({ userId })
      .orderBy('created_at', 'desc')
  }

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return this.expiresAt <= getCurrentDate()
  }

  /**
   * Check if token is valid (not expired and not deleted)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isDeleted()
  }

  /**
   * Delete expired tokens (cleanup method)
   */
  static async deleteExpired(): Promise<number> {
    const deleted = await this.query().modify('expired').delete()
    return deleted
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllForUser(userId: string): Promise<number> {
    const deleted = await this.query()
      .modify('notDeleted')
      .where('user_id', userId)
      .patch({ deletedAt: getCurrentISOString() as unknown as Date })
    return deleted
  }
}

/**
 * Calculate token expiry date from JWT token string
 * @param token - JWT token string
 * @returns Expiry date
 */
export const getTokenExpiry = (token: string): Date => {
  // Decode token without verification to get expiry
  const decoded = JSON.parse(
    Buffer.from(token.split('.')[1] ?? '', 'base64').toString()
  )
  const exp = decoded.exp
  if (!exp) {
    throw new Error('Token does not have expiry claim')
  }
  return moment.unix(exp).utc().toDate()
}
