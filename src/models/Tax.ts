import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'

export enum TaxType {
  NORMAL = 'normal',
  COMPOUND = 'compound',
  WITHHOLDING = 'withholding',
}

/**
 * Tax Model
 * Represents a tax rate configuration in tenant-specific schema
 * Supports normal, compound, and withholding tax types
 */
export class Tax extends BaseModel {
  static override get tableName(): string {
    return 'taxes'
  }

  // Properties
  declare id: string
  declare tenantId: string
  declare createdBy: string
  declare name: string
  declare type: TaxType
  declare rate: number
  declare isActive: boolean
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['tenantId', 'createdBy', 'name', 'type', 'rate'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        type: {
          type: 'string',
          enum: ['normal', 'compound', 'withholding'],
          default: 'normal',
        },
        rate: { type: 'number', minimum: 0, maximum: 100 },
        isActive: { type: 'boolean', default: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  // Query modifiers
  static override get modifiers() {
    return {
      ...super.modifiers,
      active(query: QueryBuilder<Tax>) {
        query.where('is_active', true)
      },
      byTenant(query: QueryBuilder<Tax>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
      byType(query: QueryBuilder<Tax>, type: TaxType) {
        query.where('type', type)
      },
    }
  }

  /**
   * Calculate tax amount from base amount
   * @param amount - Base amount to calculate tax on
   * @returns Tax amount
   */
  calculateTax(amount: number): number {
    return (amount * this.rate) / 100
  }

  /**
   * Get amount with tax included
   * @param amount - Base amount
   * @returns Amount including tax
   */
  getAmountWithTax(amount: number): number {
    return amount + this.calculateTax(amount)
  }

  /**
   * Get amount without tax (reverse calculation)
   * @param amountWithTax - Amount that includes tax
   * @returns Base amount without tax
   */
  getAmountWithoutTax(amountWithTax: number): number {
    return amountWithTax / (1 + this.rate / 100)
  }
}
