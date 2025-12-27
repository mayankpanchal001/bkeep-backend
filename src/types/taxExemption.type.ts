/**
 * Tax Exemption Types
 * TypeScript type definitions for Tax Exemptions
 */

import type { Tax } from '@models/Tax'
import type { TaxExemption, TaxExemptionType } from '@models/TaxExemption'

/**
 * Input type for creating a new tax exemption
 */
export interface CreateTaxExemptionInput {
  contactId: string
  taxId?: string | null // null = applies to all taxes
  exemptionType: TaxExemptionType
  certificateNumber?: string
  certificateExpiry?: string // ISO date string
  reason?: string
  isActive?: boolean
}

/**
 * Input type for updating a tax exemption
 */
export interface UpdateTaxExemptionInput {
  taxId?: string | null
  exemptionType?: TaxExemptionType
  certificateNumber?: string
  certificateExpiry?: string // ISO date string
  reason?: string
  isActive?: boolean
}

/**
 * Filter parameters for listing tax exemptions
 */
export interface TaxExemptionFilters {
  contactId?: string
  taxId?: string
  exemptionType?: TaxExemptionType
  isActive?: boolean
  expired?: boolean // true = only expired, false = only not expired
  search?: string
  page: number
  limit: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Result type for tax exemptions list query
 */
export interface TaxExemptionListResult {
  taxExemptions: TaxExemption[]
  total: number
}

/**
 * Tax exemption with tax relation
 */
export interface TaxExemptionWithTax {
  id: string
  tenantId: string
  createdBy: string
  contactId: string
  taxId?: string | null
  exemptionType: TaxExemptionType
  certificateNumber?: string | null
  certificateExpiry?: Date | null
  reason?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  tax?: Tax | null
}
