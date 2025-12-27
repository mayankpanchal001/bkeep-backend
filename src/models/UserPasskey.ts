import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'

/**
 * UserPasskey Model
 * Represents a WebAuthn/FIDO2 passkey credential for a user
 */
export class UserPasskey extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'user_passkeys'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  userId!: string
  credentialId!: string
  publicKey!: string
  counter!: number
  credentialType!: 'platform' | 'roaming'
  transports?: string[] | null
  aaguid?: string | null
  name!: string
  isActive!: boolean
  lastUsedAt?: Date | null
  userAgent?: string | null
  ipAddress?: string | null
  backupEligible!: boolean
  backupState!: boolean

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'credentialId', 'publicKey', 'counter', 'name'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        credentialId: { type: 'string', minLength: 1, maxLength: 1024 },
        publicKey: { type: 'string', minLength: 1 },
        counter: { type: 'integer', minimum: 0 },
        credentialType: {
          type: 'string',
          enum: ['platform', 'roaming'],
          default: 'platform',
        },
        transports: {
          type: ['array', 'null'],
          items: {
            type: 'string',
            enum: ['internal', 'usb', 'nfc', 'ble', 'hybrid'],
          },
        },
        aaguid: { type: ['string', 'null'], maxLength: 255 },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        isActive: { type: 'boolean', default: true },
        lastUsedAt: { type: ['string', 'null'], format: 'date-time' },
        userAgent: { type: ['string', 'null'], maxLength: 500 },
        ipAddress: { type: ['string', 'null'], maxLength: 45 },
        backupEligible: { type: 'boolean', default: false },
        backupState: { type: 'boolean', default: false },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with UserPasskey-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only active passkeys
      active(query: QueryBuilder<UserPasskey>) {
        query.where('is_active', true)
      },
      // Only inactive passkeys
      inactive(query: QueryBuilder<UserPasskey>) {
        query.where('is_active', false)
      },
      // Filter by user ID
      byUser(query: QueryBuilder<UserPasskey>, userId: string) {
        query.where('user_id', userId)
      },
      // Filter by credential type
      byType(
        query: QueryBuilder<UserPasskey>,
        credentialType: 'platform' | 'roaming'
      ) {
        query.where('credential_type', credentialType)
      },
    }
  }

  /**
   * Check if passkey is active
   */
  isPasskeyActive(): boolean {
    return this.isActive && !this.deletedAt
  }

  /**
   * Find active passkey by user ID and credential ID
   */
  static async findActiveByUserAndCredentialId(
    userId: string,
    credentialId: string
  ): Promise<UserPasskey | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .modify('byUser', userId)
      .where('credential_id', credentialId)
      .first()
  }

  /**
   * Find all active passkeys for a user
   */
  static async findActiveByUser(userId: string): Promise<UserPasskey[]> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .modify('byUser', userId)
      .orderBy('last_used_at', 'desc')
      .orderBy('created_at', 'desc')
  }

  /**
   * Find passkey by credential ID (for authentication)
   */
  static async findByCredentialId(
    credentialId: string
  ): Promise<UserPasskey | undefined> {
    return this.query()
      .modify('notDeleted')
      .modify('active')
      .where('credential_id', credentialId)
      .first()
  }

  /**
   * Count active passkeys for a user
   */
  static async countActiveByUser(userId: string): Promise<number> {
    const result = (await this.query()
      .modify('notDeleted')
      .modify('active')
      .modify('byUser', userId)
      .count('* as count')
      .first()) as { count?: string | number } | undefined

    return Number.parseInt(String(result?.count ?? '0')) || 0
  }
}
