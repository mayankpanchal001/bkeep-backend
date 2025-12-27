import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'
import { ChartOfAccount } from '@models/ChartOfAccount'
import { JournalEntry } from '@models/JournalEntry'
import { JournalEntryLine } from '@models/JournalEntryLine'

export enum BalanceChangeType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

/**
 * AccountBalanceHistory Model
 * Tracks all balance changes to Chart of Accounts over time
 * Provides complete audit trail for balance updates
 */
export class AccountBalanceHistory extends BaseModel {
  static override get tableName(): string {
    return 'account_balance_history'
  }

  // Properties
  declare id: string
  declare tenantId: string
  declare accountId: string
  declare journalEntryId?: string | null
  declare journalEntryLineId?: string | null
  declare previousBalance: number
  declare newBalance: number
  declare changeAmount: number
  declare changeType: BalanceChangeType
  declare changeDate: Date
  declare description?: string | null
  declare sourceModule?: string | null
  declare sourceId?: string | null
  declare createdBy: string
  declare createdAt: Date

  // Relations
  account?: ChartOfAccount
  journalEntry?: JournalEntry
  journalEntryLine?: JournalEntryLine

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: [
        'tenantId',
        'accountId',
        'previousBalance',
        'newBalance',
        'changeAmount',
        'changeType',
        'changeDate',
        'createdBy',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        accountId: { type: 'string', format: 'uuid' },
        journalEntryId: { type: ['string', 'null'], format: 'uuid' },
        journalEntryLineId: { type: ['string', 'null'], format: 'uuid' },
        previousBalance: { type: 'number' },
        newBalance: { type: 'number' },
        changeAmount: { type: 'number', minimum: 0 },
        changeType: { type: 'string', enum: ['debit', 'credit'] },
        changeDate: { type: 'string', format: 'date-time' },
        description: { type: ['string', 'null'] },
        sourceModule: { type: ['string', 'null'], maxLength: 100 },
        sourceId: { type: ['string', 'null'], format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
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
          from: 'account_balance_history.account_id',
          to: 'chart_of_accounts.id',
        },
      },
      journalEntry: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: JournalEntry,
        join: {
          from: 'account_balance_history.journal_entry_id',
          to: 'journal_entries.id',
        },
      },
      journalEntryLine: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: JournalEntryLine,
        join: {
          from: 'account_balance_history.journal_entry_line_id',
          to: 'journal_entry_lines.id',
        },
      },
    }
  }

  // Query modifiers
  static override get modifiers() {
    return {
      ...super.modifiers,
      byTenant(query: QueryBuilder<AccountBalanceHistory>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
      byAccount(query: QueryBuilder<AccountBalanceHistory>, accountId: string) {
        query.where('account_id', accountId)
      },
      byJournalEntry(
        query: QueryBuilder<AccountBalanceHistory>,
        journalEntryId: string
      ) {
        query.where('journal_entry_id', journalEntryId)
      },
      byDateRange(
        query: QueryBuilder<AccountBalanceHistory>,
        startDate: Date,
        endDate: Date
      ) {
        query.whereBetween('change_date', [startDate, endDate])
      },
      byChangeType(
        query: QueryBuilder<AccountBalanceHistory>,
        changeType: BalanceChangeType
      ) {
        query.where('change_type', changeType)
      },
      withRelations(query: QueryBuilder<AccountBalanceHistory>) {
        query.withGraphFetched('[account, journalEntry, journalEntryLine]')
      },
      recentFirst(query: QueryBuilder<AccountBalanceHistory>) {
        query.orderBy('change_date', 'desc').orderBy('created_at', 'desc')
      },
    }
  }

  // Helper methods
  isDebit(): boolean {
    return this.changeType === BalanceChangeType.DEBIT
  }

  isCredit(): boolean {
    return this.changeType === BalanceChangeType.CREDIT
  }

  /**
   * Get the net change (positive for increase, negative for decrease)
   */
  getNetChange(): number {
    return this.newBalance - this.previousBalance
  }
}
