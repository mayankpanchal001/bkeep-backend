import type { QueryBuilder } from 'objection'

import { BaseModel } from '@models/BaseModel'

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AssetSubtype {
  CURRENT_ASSET = 'current_asset',
  FIXED_ASSET = 'fixed_asset',
  OTHER_ASSET = 'other_asset',
}

export enum LiabilitySubtype {
  CURRENT_LIABILITY = 'current_liability',
  LONG_TERM_LIABILITY = 'long_term_liability',
  OTHER_LIABILITY = 'other_liability',
}

export enum EquitySubtype {
  EQUITY = 'equity',
  RETAINED_EARNINGS = 'retained_earnings',
}

export enum RevenueSubtype {
  OPERATING_REVENUE = 'operating_revenue',
  OTHER_REVENUE = 'other_revenue',
}

export enum ExpenseSubtype {
  COST_OF_GOODS_SOLD = 'cost_of_goods_sold',
  OPERATING_EXPENSE = 'operating_expense',
  OTHER_EXPENSE = 'other_expense',
}

/**
 * ChartOfAccount Model
 * Represents accounts in the Chart of Accounts (General Ledger)
 * Foundation for proper double-entry accounting
 */
export class ChartOfAccount extends BaseModel {
  static override get tableName(): string {
    return 'chart_of_accounts'
  }

  // Properties
  declare id: string
  declare tenantId: string
  declare createdBy: string
  declare accountNumber?: string | null
  declare accountName: string
  declare accountType: AccountType
  declare accountSubtype?: string | null
  declare accountDetailType?: string | null
  declare parentAccountId?: string | null
  declare currentBalance: number
  declare openingBalance: number
  declare isActive: boolean
  declare isSystemAccount: boolean
  declare currencyCode: string
  declare description?: string | null
  declare trackTax: boolean
  declare defaultTaxId?: string | null
  declare bankAccountNumber?: string | null
  declare bankRoutingNumber?: string | null
  declare bankAccountId?: string | null
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt?: Date | null

  // Relations
  parent?: ChartOfAccount
  children?: ChartOfAccount[]
  bankAccount?: import('./Account').Account

  // JSON Schema
  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['tenantId', 'createdBy', 'accountName', 'accountType'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        createdBy: { type: 'string', format: 'uuid' },
        accountNumber: { type: ['string', 'null'], maxLength: 50 },
        accountName: { type: 'string', minLength: 1, maxLength: 255 },
        accountType: {
          type: 'string',
          enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
        },
        accountSubtype: { type: ['string', 'null'], maxLength: 100 },
        accountDetailType: { type: ['string', 'null'], maxLength: 100 },
        parentAccountId: { type: ['string', 'null'], format: 'uuid' },
        currentBalance: { type: 'number', default: 0 },
        openingBalance: { type: 'number', default: 0 },
        isActive: { type: 'boolean', default: true },
        isSystemAccount: { type: 'boolean', default: false },
        currencyCode: {
          type: 'string',
          minLength: 3,
          maxLength: 3,
          default: 'CAD',
        },
        description: { type: ['string', 'null'] },
        trackTax: { type: 'boolean', default: false },
        defaultTaxId: { type: ['string', 'null'], format: 'uuid' },
        bankAccountNumber: { type: ['string', 'null'], maxLength: 100 },
        bankRoutingNumber: { type: ['string', 'null'], maxLength: 50 },
        bankAccountId: { type: ['string', 'null'], format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  // Relation mappings
  static override get relationMappings() {
    return {
      parent: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: ChartOfAccount,
        join: {
          from: 'chart_of_accounts.parent_account_id',
          to: 'chart_of_accounts.id',
        },
      },
      children: {
        relation: BaseModel.HasManyRelation,
        modelClass: ChartOfAccount,
        join: {
          from: 'chart_of_accounts.id',
          to: 'chart_of_accounts.parent_account_id',
        },
      },
      bankAccount: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'Account',
        join: {
          from: 'chart_of_accounts.bank_account_id',
          to: 'accounts.id',
        },
      },
    }
  }

  // Query modifiers
  static override get modifiers() {
    return {
      ...super.modifiers,
      byTenant(query: QueryBuilder<ChartOfAccount>, tenantId: string) {
        query.where('tenant_id', tenantId)
      },
      active(query: QueryBuilder<ChartOfAccount>) {
        query.where('is_active', true)
      },
      byType(query: QueryBuilder<ChartOfAccount>, type: AccountType) {
        query.where('account_type', type)
      },
      bySubtype(query: QueryBuilder<ChartOfAccount>, subtype: string) {
        query.where('account_subtype', subtype)
      },
      topLevel(query: QueryBuilder<ChartOfAccount>) {
        query.whereNull('parent_account_id')
      },
      withChildren(query: QueryBuilder<ChartOfAccount>) {
        query.withGraphFetched('children')
      },
      system(query: QueryBuilder<ChartOfAccount>) {
        query.where('is_system_account', true)
      },
      nonSystem(query: QueryBuilder<ChartOfAccount>) {
        query.where('is_system_account', false)
      },
    }
  }

  // Helper methods
  isAsset(): boolean {
    return this.accountType === AccountType.ASSET
  }

  isLiability(): boolean {
    return this.accountType === AccountType.LIABILITY
  }

  isEquity(): boolean {
    return this.accountType === AccountType.EQUITY
  }

  isRevenue(): boolean {
    return this.accountType === AccountType.REVENUE
  }

  isExpense(): boolean {
    return this.accountType === AccountType.EXPENSE
  }

  isDebitAccount(): boolean {
    // Assets and Expenses increase with debits
    return this.isAsset() || this.isExpense()
  }

  isCreditAccount(): boolean {
    // Liabilities, Equity, and Revenue increase with credits
    return this.isLiability() || this.isEquity() || this.isRevenue()
  }

  /**
   * Update account balance based on debit or credit
   */
  updateBalance(amount: number, isDebit: boolean): number {
    const currentBalance = Number(this.currentBalance || 0)
    const amountNum = Number(amount || 0)

    if (this.isDebitAccount()) {
      // Debit accounts: increase with debit, decrease with credit
      return isDebit ? currentBalance + amountNum : currentBalance - amountNum
    } else {
      // Credit accounts: decrease with debit, increase with credit
      return isDebit ? currentBalance - amountNum : currentBalance + amountNum
    }
  }

  /**
   * Get formatted account display name
   */
  getDisplayName(): string {
    return this.accountNumber
      ? `${this.accountNumber} - ${this.accountName}`
      : this.accountName
  }
}
