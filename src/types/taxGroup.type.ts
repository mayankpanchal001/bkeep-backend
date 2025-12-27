/**
 * Tax Group Types
 * TypeScript type definitions for Tax Groups
 */

import type { Tax } from '@models/Tax'
import type { TaxGroup } from '@models/TaxGroup'

/**
 * Input type for creating a new tax group
 */
export interface CreateTaxGroupInput {
  name: string
  description?: string
  taxIds: string[] // Array of tax IDs to include in the group
}

/**
 * Input type for updating a tax group
 */
export interface UpdateTaxGroupInput {
  name?: string
  description?: string
  isActive?: boolean
  taxIds?: string[] // Array of tax IDs to include in the group
}

/**
 * Filter parameters for listing tax groups
 */
export interface TaxGroupFilters {
  isActive?: boolean
  search?: string
  page: number
  limit: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Result type for tax groups list query
 */
export interface TaxGroupListResult {
  taxGroups: TaxGroup[]
  total: number
}

/**
 * Tax group with taxes relation
 */
export interface TaxGroupWithTaxes extends TaxGroup {
  taxes: Tax[]
}

/**
 * Tax calculation result
 */
export interface TaxCalculationResult {
  baseAmount: number
  taxAmount: number
  totalAmount: number
  effectiveRate: number
  taxBreakdown: Array<{
    taxId: string
    taxName: string
    taxRate: number
    taxAmount: number
  }>
}
