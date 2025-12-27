import type { QueryBuilder } from 'objection'

import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { BaseModel } from '@models/BaseModel'
import { JournalEntryLine } from '@models/JournalEntryLine'
import { ApiError } from '@utils/ApiError'

export enum JournalEntryType {
  STANDARD = 'standard',
  ADJUSTING = 'adjusting',
  CLOSING = 'closing',
  REVERSING = 'reversing',
}

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  VOIDED = 'voided',
}

/**
 * JournalEntry Model
 * Represents a journal entry (double-entry bookkeeping)
 * Foundation for proper accounting and general ledger tracking
 */
export class JournalEntry extends BaseModel {
  static override get tableName(): string {
    return 'journal_entries'
  }

  // Properties
  declare id: string
  declare tenantId: string
  declare createdBy: string
  declare entryNumber?: string | null
  declare entryDate: Date
  declare entryType: JournalEntryType
  declare isAdjusting: boolean
  declare isClosing: boolean
  declare isReversing: boolean
  declare reversalDate?: Date | null
  declare description?: string | null
  declare reference?: string | null
  declare memo?: string | null
  declare status: JournalEntryStatus
  declare sourceModule?: string | null
  declare sourceId?: string | null
  declare totalDebit: number
  declare totalCredit: number
  declare approvedBy?: string | null
  declare approvedAt?: Date | null
  declare postedBy?: string | null
  declare postedAt?: Date | null
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  // Relations
  lines?: JournalEntryLine[]

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['tenantId', 'createdBy', 'entryDate'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
        entryNumber: { type: ['string', 'null'], maxLength: 100 },
        entryDate: { type: 'string', format: 'date-time' },
        entryType: {
          type: 'string',
          enum: ['standard', 'adjusting', 'closing', 'reversing'],
          default: 'standard',
        },
        isAdjusting: { type: 'boolean', default: false },
        isClosing: { type: 'boolean', default: false },
        isReversing: { type: 'boolean', default: false },
        reversalDate: { type: ['string', 'null'], format: 'date-time' },
        description: { type: ['string', 'null'] },
        reference: { type: ['string', 'null'], maxLength: 255 },
        memo: { type: ['string', 'null'] },
        status: {
          type: 'string',
          enum: ['draft', 'posted', 'voided'],
          default: 'draft',
        },
        sourceModule: { type: ['string', 'null'], maxLength: 100 },
        sourceId: { type: ['string', 'null'], format: 'uuid' },
        totalDebit: { type: 'number', minimum: 0, default: 0 },
        totalCredit: { type: 'number', minimum: 0, default: 0 },
        approvedBy: { type: ['string', 'null'], format: 'uuid' },
        approvedAt: { type: ['string', 'null'], format: 'date-time' },
        postedBy: { type: ['string', 'null'], format: 'uuid' },
        postedAt: { type: ['string', 'null'], format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  // Relation mappings
  static override get relationMappings() {
    return {
      lines: {
        relation: BaseModel.HasManyRelation,
        modelClass: JournalEntryLine,
        join: {
          from: 'journal_entries.id',
          to: 'journal_entry_lines.journal_entry_id',
        },
        filter: (query: QueryBuilder<JournalEntryLine>) => {
          query.modify('notDeleted')
        },
      },
    }
  }

  // Query modifiers
  static override get modifiers() {
    return {
      ...super.modifiers,
      byTenant(query: QueryBuilder<JournalEntry>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
      byStatus(query: QueryBuilder<JournalEntry>, status: JournalEntryStatus) {
        query.where('status', status)
      },
      draft(query: QueryBuilder<JournalEntry>) {
        query.where('status', JournalEntryStatus.DRAFT)
      },
      posted(query: QueryBuilder<JournalEntry>) {
        query.where('status', JournalEntryStatus.POSTED)
      },
      voided(query: QueryBuilder<JournalEntry>) {
        query.where('status', JournalEntryStatus.VOIDED)
      },
      byDateRange(
        query: QueryBuilder<JournalEntry>,
        startDate: Date,
        endDate: Date
      ) {
        query.whereBetween('entry_date', [startDate, endDate])
      },
      byType(query: QueryBuilder<JournalEntry>, entryType: JournalEntryType) {
        query.where('entry_type', entryType)
      },
      withLines(query: QueryBuilder<JournalEntry>) {
        query.withGraphFetched('lines.account')
      },
    }
  }

  // Helper methods
  /**
   * Check if journal entry is in draft status
   */
  isDraft(): boolean {
    return this.status === JournalEntryStatus.DRAFT
  }

  /**
   * Check if journal entry is posted
   */
  isPosted(): boolean {
    return this.status === JournalEntryStatus.POSTED
  }

  /**
   * Check if journal entry is voided
   */
  isVoided(): boolean {
    return this.status === JournalEntryStatus.VOIDED
  }

  /**
   * Validate that debits equal credits
   */
  isBalanced(): boolean {
    if (!this.lines || this.lines.length === 0) {
      return false
    }

    const debitTotal = this.lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0
    )
    const creditTotal = this.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0
    )

    // Allow for small floating point differences
    return Math.abs(debitTotal - creditTotal) < 0.0005
  }

  /**
   * Validate journal entry before posting
   * Throws ApiError if validation fails
   */
  validate(): void {
    if (!this.lines || this.lines.length < 2) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.JOURNAL_ENTRY_INSUFFICIENT_LINES
      )
    }

    // Validate each line
    for (const line of this.lines) {
      if (!line.isValid()) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.JOURNAL_ENTRY_LINE_INVALID
        )
      }
    }

    // Recalculate totals from lines
    this.calculateTotals()

    // Validate balance
    if (!this.isBalanced()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.JOURNAL_ENTRY_NOT_BALANCED
      )
    }
  }

  /**
   * Calculate totals from lines and update model
   */
  calculateTotals(): void {
    if (!this.lines || this.lines.length === 0) {
      this.totalDebit = 0
      this.totalCredit = 0
      return
    }

    this.totalDebit = this.lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0
    )
    this.totalCredit = this.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0
    )
  }
}
