import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { User } from '@models/User'
import { getCurrentDate } from '@utils/date'

/**
 * MfaEmailOtp Model
 * Represents a temporary email-based OTP code for multi-factor authentication
 * These codes are sent via email and expire after 5 minutes
 */
export class MfaEmailOtp extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'mfa_email_otps'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  userId!: string
  code!: string
  expiresAt!: Date
  userAgent?: string | null
  ipAddress?: string | null

  // Relations
  user?: User

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'code', 'expiresAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        code: { type: 'string', minLength: 1, maxLength: 255 },
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
   * Relation mappings
   */
  static override get relationMappings() {
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'mfa_email_otps.user_id',
          to: 'users.id',
        },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with MfaEmailOtp-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only non-expired email OTP codes
      notExpired(query: QueryBuilder<MfaEmailOtp>) {
        query.where('expires_at', '>', getCurrentDate())
      },
      // Only expired email OTP codes
      expired(query: QueryBuilder<MfaEmailOtp>) {
        query.where('expires_at', '<=', getCurrentDate())
      },
    }
  }

  /**
   * Scope: Find by user ID and code (only valid, non-expired email OTP codes)
   */
  static async findByUserIdAndCode(
    userId: string,
    code: string
  ): Promise<MfaEmailOtp | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .where({ userId, code })
      .first()
  }

  /**
   * Scope: Find by user ID (only valid, non-expired email OTP codes)
   */
  static async findByUserId(userId: string): Promise<MfaEmailOtp | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .where({ userId })
      .orderBy('created_at', 'desc')
      .first()
  }

  /**
   * Scope: Find by code (only valid, non-expired email OTP codes)
   */
  static async findByCode(code: string): Promise<MfaEmailOtp | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .findOne({ code })
  }

  /**
   * Check if email OTP code is expired
   */
  isExpired(): boolean {
    return this.expiresAt <= getCurrentDate()
  }

  /**
   * Check if email OTP code is valid (not expired and not deleted)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isDeleted()
  }

  /**
   * Delete expired email OTP codes (cleanup method)
   */
  static async deleteExpired(): Promise<number> {
    const deleted = await this.query().modify('expired').delete()

    return deleted
  }
}
