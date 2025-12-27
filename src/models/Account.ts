import type { Knex } from 'knex'
import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'

/**
 * Account Model
 * Represents a bank account in a tenant-specific schema
 * Note: This model works with tenant-specific schemas, not the public schema
 */
export class Account extends BaseModel {
  // Table name
  static override get tableName(): string {
    return 'accounts'
  }

  // Model properties (inherits id, createdAt, updatedAt, deletedAt from BaseModel)
  declare id: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  tenantId!: string
  createdBy!: string
  name!: string
  number?: string | null
  type!: string
  currencyCode!: string
  openingBalance!: number
  currentBalance!: number
  bankName?: string | null
  isActive!: boolean
  lastReconciledAt?: Date | null
  reconciledBalance?: number | null
  lastReconciledBy?: string | null

  // JSON Schema for validation
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['tenantId', 'createdBy', 'name', 'currencyCode'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        number: { type: ['string', 'null'], maxLength: 255 },
        type: { type: 'string', minLength: 1, maxLength: 255 },
        currencyCode: { type: 'string', minLength: 3, maxLength: 3 },
        openingBalance: { type: 'number', default: 0 },
        currentBalance: { type: 'number', default: 0 },
        bankName: { type: ['string', 'null'], maxLength: 255 },
        isActive: { type: 'boolean', default: true },
        lastReconciledAt: { type: ['string', 'null'], format: 'date-time' },
        reconciledBalance: { type: ['number', 'null'] },
        lastReconciledBy: { type: ['string', 'null'], format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  /**
   * Query builder modifiers
   * Extends BaseModel modifiers with Account-specific ones
   */
  static override get modifiers() {
    return {
      ...super.modifiers,
      // Only active accounts (is_active = true)
      active(query: QueryBuilder<Account>) {
        query.where('is_active', true)
      },
      // Only inactive accounts (is_active = false)
      inactive(query: QueryBuilder<Account>) {
        query.where('is_active', false)
      },
      // Search by name or number
      search(query: QueryBuilder<Account>, searchTerm: string) {
        query.where((builder: QueryBuilder<Account>) => {
          builder
            .where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('number', 'ilike', `%${searchTerm}%`)
        })
      },
      // Filter by tenant
      byTenant(query: QueryBuilder<Account>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
    }
  }

  /**
   * Get query builder for a specific tenant schema
   * @param knex - Knex instance configured for tenant schema
   * @returns Query builder for Account model in tenant schema
   */
  static queryForTenant(knex: Knex): QueryBuilder<Account> {
    return this.query(knex)
  }

  /**
   * Scope: Find by tenant (only active, non-deleted accounts)
   */
  static async findByTenant(knex: Knex, tenantId: string): Promise<Account[]> {
    return this.queryForTenant(knex)
      .modify('notDeleted')
      .modify('active')
      .modify('byTenant', tenantId)
  }

  /**
   * Scope: Find active accounts (non-deleted)
   */
  static async findActive(knex: Knex): Promise<Account[]> {
    return this.queryForTenant(knex).modify('notDeleted').modify('active')
  }

  /**
   * Scope: Search by term (only active, non-deleted accounts)
   */
  static async search(
    knex: Knex,
    term: string,
    tenantId: string
  ): Promise<Account[]> {
    return this.queryForTenant(knex)
      .modify('notDeleted')
      .modify('active')
      .modify('byTenant', tenantId)
      .modify('search', term)
  }

  /**
   * Update account balance
   * @param amount - Amount to add/subtract
   * @param isIncrease - true to increase balance, false to decrease
   * @returns New balance
   */
  updateBalance(amount: number, isIncrease: boolean): number {
    return isIncrease
      ? this.currentBalance + amount
      : this.currentBalance - amount
  }
}
