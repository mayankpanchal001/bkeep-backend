/**
 * Chart of Account Types
 * TypeScript type definitions for Chart of Accounts
 */

import type { AccountType, ChartOfAccount } from '@models/ChartOfAccount'

/**
 * Input type for creating a new chart of account
 */
export interface CreateChartOfAccountInput {
  accountNumber?: string
  accountName: string
  accountType: AccountType
  accountSubtype?: string
  accountDetailType?: string
  parentAccountId?: string
  openingBalance?: number
  currencyCode?: string
  description?: string
  trackTax?: boolean
  defaultTaxId?: string
  bankAccountNumber?: string
  bankRoutingNumber?: string
}

/**
 * Input type for updating a chart of account
 */
export interface UpdateChartOfAccountInput {
  accountNumber?: string
  accountName?: string
  accountSubtype?: string
  accountDetailType?: string
  parentAccountId?: string | null
  currencyCode?: string
  description?: string | null
  trackTax?: boolean
  defaultTaxId?: string | null
  bankAccountNumber?: string | null
  bankRoutingNumber?: string | null
  isActive?: boolean
}

/**
 * Filter parameters for listing chart of accounts
 */
export interface ChartOfAccountFilters {
  accountType?: AccountType
  accountSubtype?: string
  isActive?: boolean
  search?: string
  parentAccountId?: string | null
  page: number
  limit: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Result type for chart of accounts list query
 */
export interface ChartOfAccountListResult {
  accounts: ChartOfAccount[]
  total: number
}
