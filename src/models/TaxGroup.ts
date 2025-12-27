import { Model, type QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { Tax } from '@models/Tax'

/**
 * TaxGroup Model
 * Represents a tax group that combines multiple taxes
 * Example: "GST + PST" group combining 5% GST and 7% PST
 */
export class TaxGroup extends BaseModel {
  static override get tableName(): string {
    return 'tax_groups'
  }

  // Properties
  declare id: string
  declare tenantId: string
  declare createdBy: string
  declare name: string
  declare description?: string | null
  declare isActive: boolean
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  // Relations
  declare taxes?: Tax[]

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['tenantId', 'createdBy', 'name'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: ['string', 'null'], maxLength: 1000 },
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
      active(query: QueryBuilder<TaxGroup>) {
        query.where('is_active', true)
      },
      byTenant(query: QueryBuilder<TaxGroup>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
    }
  }

  // Relations
  static override get relationMappings() {
    return {
      taxes: {
        relation: Model.ManyToManyRelation,
        modelClass: Tax,
        join: {
          from: 'tax_groups.id',
          through: {
            from: 'tax_group_taxes.tax_group_id',
            to: 'tax_group_taxes.tax_id',
            extra: ['order_index'],
          },
          to: 'taxes.id',
        },
        modify: (query: QueryBuilder<Tax>) => {
          query
            .whereNull('taxes.deleted_at')
            .whereNull('tax_group_taxes.deleted_at')
            .orderBy('tax_group_taxes.order_index', 'asc')
        },
      },
    }
  }

  /**
   * Calculate total tax amount from base amount for all taxes in group
   * Handles compound taxes correctly (tax on tax)
   * @param amount - Base amount to calculate tax on
   * @returns Total tax amount
   */
  calculateTax(amount: number): number {
    if (!this.taxes || this.taxes.length === 0) {
      return 0
    }

    let currentAmount = amount
    let totalTax = 0

    // Process taxes in order (important for compound taxes)
    for (const tax of this.taxes) {
      const taxAmount = tax.calculateTax(currentAmount)
      totalTax += taxAmount

      // For compound taxes, add tax to base for next calculation
      if (tax.type === 'compound') {
        currentAmount += taxAmount
      }
    }

    return totalTax
  }

  /**
   * Get amount with tax included
   * @param amount - Base amount
   * @returns Amount including all taxes in group
   */
  getAmountWithTax(amount: number): number {
    return amount + this.calculateTax(amount)
  }

  /**
   * Get effective tax rate (combined rate of all taxes in group)
   * @returns Effective tax rate as percentage
   */
  getEffectiveRate(): number {
    if (!this.taxes || this.taxes.length === 0) {
      return 0
    }

    // For simple case (no compound taxes), sum the rates
    const hasCompound = this.taxes.some((tax) => tax.type === 'compound')
    if (!hasCompound) {
      return this.taxes.reduce((sum, tax) => sum + tax.rate, 0)
    }

    // For compound taxes, calculate effective rate from a sample amount
    const sampleAmount = 1000
    const taxAmount = this.calculateTax(sampleAmount)
    return (taxAmount / sampleAmount) * 100
  }
}
