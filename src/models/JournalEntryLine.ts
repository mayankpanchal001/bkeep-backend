import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { ChartOfAccount } from '@models/ChartOfAccount'

/**
 * JournalEntryLine Model
 * Represents a single line in a journal entry (debit or credit)
 * Each journal entry must have at least 2 lines (one debit, one credit)
 */
export class JournalEntryLine extends BaseModel {
  static override get tableName(): string {
    return 'journal_entry_lines'
  }

  // Properties
  declare id: string
  declare tenantId: string
  declare createdBy: string
  declare journalEntryId: string
  declare accountId: string
  declare lineNumber: number
  declare debit: number
  declare credit: number
  declare description?: string | null
  declare memo?: string | null
  declare contactId?: string | null
  declare createdAt: Date
  declare updatedAt: Date

  // Relations
  account?: ChartOfAccount

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: [
        'tenantId',
        'createdBy',
        'journalEntryId',
        'accountId',
        'lineNumber',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
        journalEntryId: { type: 'string', format: 'uuid' },
        accountId: { type: 'string', format: 'uuid' },
        lineNumber: { type: 'integer', minimum: 1 },
        debit: { type: 'number', minimum: 0, default: 0 },
        credit: { type: 'number', minimum: 0, default: 0 },
        description: { type: ['string', 'null'] },
        memo: { type: ['string', 'null'] },
        contactId: { type: ['string', 'null'], format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  // Relation mappings
  static override get relationMappings() {
    return {
      account: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: ChartOfAccount,
        join: {
          from: 'journal_entry_lines.account_id',
          to: 'chart_of_accounts.id',
        },
      },
    }
  }

  // Query modifiers
  static override get modifiers() {
    return {
      ...super.modifiers,
      byTenant(query: QueryBuilder<JournalEntryLine>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
      byJournalEntry(
        query: QueryBuilder<JournalEntryLine>,
        journalEntryId: string
      ) {
        query.where('journal_entry_id', journalEntryId)
      },
      byAccount(query: QueryBuilder<JournalEntryLine>, accountId: string) {
        query.where('account_id', accountId)
      },
      debits(query: QueryBuilder<JournalEntryLine>) {
        query.where('debit', '>', 0).where('credit', 0)
      },
      credits(query: QueryBuilder<JournalEntryLine>) {
        query.where('credit', '>', 0).where('debit', 0)
      },
    }
  }

  // Helper methods
  /**
   * Check if this line is a debit
   */
  isDebit(): boolean {
    return this.debit > 0 && this.credit === 0
  }

  /**
   * Check if this line is a credit
   */
  isCredit(): boolean {
    return this.credit > 0 && this.debit === 0
  }

  /**
   * Get the amount (debit or credit)
   */
  getAmount(): number {
    return this.debit > 0 ? this.debit : this.credit
  }

  /**
   * Validate that line has either debit or credit (not both, not neither)
   */
  isValid(): boolean {
    const hasDebit = this.debit > 0
    const hasCredit = this.credit > 0

    // Must have exactly one (debit XOR credit)
    return hasDebit !== hasCredit
  }
}
