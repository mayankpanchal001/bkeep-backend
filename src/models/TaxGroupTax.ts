import { BaseModel } from '@models/BaseModel'

/**
 * TaxGroupTax Model
 * Junction table model for tax_group_taxes
 * Represents the relationship between a tax group and a tax
 */
export class TaxGroupTax extends BaseModel {
  static override get tableName(): string {
    return 'tax_group_taxes'
  }

  // Properties
  declare id: string
  declare taxGroupId: string
  declare taxId: string
  declare orderIndex: number
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['taxGroupId', 'taxId', 'orderIndex'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        taxGroupId: { type: 'string', format: 'uuid' },
        taxId: { type: 'string', format: 'uuid' },
        orderIndex: { type: 'number', minimum: 0 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }
}
