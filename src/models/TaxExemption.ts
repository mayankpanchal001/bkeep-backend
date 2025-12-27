import { Model, type QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { Tax } from '@models/Tax'

/**
 * Tax Exemption Type Enum
 */
export enum TaxExemptionType {
  RESALE = 'resale',
  NON_PROFIT = 'non_profit',
  GOVERNMENT = 'government',
  OTHER = 'other',
}

/**
 * TaxExemption Model
 * Represents a tax exemption for a contact (customer/vendor)
 */
export class TaxExemption extends BaseModel {
  static override get tableName(): string {
    return 'tax_exemptions'
  }

  // Properties
  declare id: string
  declare tenantId: string
  declare createdBy: string
  declare contactId: string
  declare taxId?: string | null
  declare exemptionType: TaxExemptionType
  declare certificateNumber?: string | null
  declare certificateExpiry?: Date | null
  declare reason?: string | null
  declare isActive: boolean
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  // Relations
  declare tax?: Tax

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['tenantId', 'createdBy', 'contactId', 'exemptionType'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
        contactId: { type: 'string', format: 'uuid' },
        taxId: { type: ['string', 'null'], format: 'uuid' },
        exemptionType: {
          type: 'string',
          enum: ['resale', 'non_profit', 'government', 'other'],
          default: 'resale',
        },
        certificateNumber: { type: ['string', 'null'], maxLength: 255 },
        certificateExpiry: { type: ['string', 'null'], format: 'date' },
        reason: { type: ['string', 'null'] },
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
      active(query: QueryBuilder<TaxExemption>) {
        query.where('is_active', true)
      },
      byTenant(query: QueryBuilder<TaxExemption>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
      byContact(query: QueryBuilder<TaxExemption>, contactId: string) {
        query.where('contact_id', contactId)
      },
      byTax(query: QueryBuilder<TaxExemption>, taxId: string) {
        query.where('tax_id', taxId)
      },
      notExpired(query: QueryBuilder<TaxExemption>) {
        query.where(function () {
          this.whereNull('certificate_expiry').orWhere(
            'certificate_expiry',
            '>=',
            new Date()
          )
        })
      },
    }
  }

  // Relations
  static override get relationMappings() {
    return {
      tax: {
        relation: Model.BelongsToOneRelation,
        modelClass: Tax,
        join: {
          from: 'tax_exemptions.tax_id',
          to: 'taxes.id',
        },
      },
    }
  }

  /**
   * Check if exemption is expired
   * @returns true if certificate has expired
   */
  isExpired(): boolean {
    if (!this.certificateExpiry) {
      return false
    }
    return new Date(this.certificateExpiry) < new Date()
  }

  /**
   * Check if exemption applies to a specific tax
   * @param taxId - Tax ID to check
   * @returns true if exemption applies (taxId is null = applies to all taxes)
   */
  appliesToTax(taxId: string): boolean {
    return this.taxId === null || this.taxId === taxId
  }
}
