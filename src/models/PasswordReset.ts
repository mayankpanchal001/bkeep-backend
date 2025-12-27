import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { getCurrentDate } from '@utils/date'

/**
 * PasswordReset Model
 * Represents a password reset token
 */
export class PasswordReset extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'password_resets'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  email!: string
  token!: string
  expiresAt!: Date

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'token', 'expiresAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email', maxLength: 255 },
        token: { type: 'string', minLength: 1, maxLength: 255 },
        expiresAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with PasswordReset-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only non-expired tokens
      notExpired(query: QueryBuilder<PasswordReset>) {
        query.where('expires_at', '>', getCurrentDate())
      },
      // Only expired tokens
      expired(query: QueryBuilder<PasswordReset>) {
        query.where('expires_at', '<=', getCurrentDate())
      },
    }
  }

  /**
   * Scope: Find by email and token (only valid, non-expired tokens)
   */
  static async findByEmailAndToken(
    email: string,
    token: string
  ): Promise<PasswordReset | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .findOne({ email, token })
  }

  /**
   * Scope: Find by email (only valid, non-expired tokens)
   */
  static async findByEmail(email: string): Promise<PasswordReset | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .where({ email })
      .orderBy('created_at', 'desc')
      .first()
  }

  /**
   * Scope: Find by token (only valid, non-expired tokens)
   */
  static async findByToken(token: string): Promise<PasswordReset | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('notExpired')
      .findOne({ token })
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
}
