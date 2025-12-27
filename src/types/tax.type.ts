/**
 * Tax Types
 * TypeScript type definitions for Taxes
 */

import type { Tax, TaxType } from '@models/Tax'

/**
 * Input type for creating a new tax
 */
export interface CreateTaxInput {
  name: string
  type: TaxType
  rate: number
  isActive?: boolean
}

/**
 * Input type for updating a tax
 */
export interface UpdateTaxInput {
  name?: string
  type?: TaxType
  rate?: number
  isActive?: boolean
}

/**
 * Filter parameters for listing taxes
 */
export interface TaxFilters {
  type?: TaxType
  isActive?: boolean
  search?: string
  page: number
  limit: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Result type for taxes list query
 */
export interface TaxListResult {
  taxes: Tax[]
  total: number
}
