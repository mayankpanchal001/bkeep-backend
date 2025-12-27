/**
 * Enhanced Tax Calculation Utilities
 * Provides utilities for calculating taxes with groups and exemptions
 */

import type { Tax, TaxType } from '@models/Tax'
import type { TaxGroup } from '@models/TaxGroup'
import { isContactExemptFromTax } from '@queries/taxExemption.queries'
import { withTenantSchema } from '@utils/tenantQuery'

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
    taxType: TaxType
    taxRate: number
    taxAmount: number
    isExempt: boolean
  }>
}

/**
 * Calculate tax with exemptions
 * @param amount - Base amount
 * @param taxes - Array of taxes to apply
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
export const calculateTaxWithExemptions = async (
  amount: number,
  taxes: Tax[],
  contactId: string | null,
  tenantId: string,
  schemaName: string
): Promise<TaxCalculationResult> => {
  let currentAmount = amount
  let totalTax = 0
  const taxBreakdown: TaxCalculationResult['taxBreakdown'] = []

  // Process each tax
  for (const tax of taxes) {
    // Check if contact is exempt from this tax
    let isExempt = false
    if (contactId) {
      isExempt = await isContactExemptFromTax(
        tenantId,
        schemaName,
        contactId,
        tax.id
      )
    }

    if (!isExempt) {
      // Calculate tax amount
      const taxAmount = tax.calculateTax(currentAmount)
      totalTax += taxAmount

      taxBreakdown.push({
        taxId: tax.id,
        taxName: tax.name,
        taxType: tax.type,
        taxRate: tax.rate,
        taxAmount,
        isExempt: false,
      })

      // For compound taxes, add tax to base for next calculation
      if (tax.type === 'compound') {
        currentAmount += taxAmount
      }
    } else {
      taxBreakdown.push({
        taxId: tax.id,
        taxName: tax.name,
        taxType: tax.type,
        taxRate: tax.rate,
        taxAmount: 0,
        isExempt: true,
      })
    }
  }

  const totalAmount = amount + totalTax
  const effectiveRate = amount > 0 ? (totalTax / amount) * 100 : 0

  return {
    baseAmount: amount,
    taxAmount: totalTax,
    totalAmount,
    effectiveRate: Number(effectiveRate.toFixed(2)),
    taxBreakdown,
  }
}

/**
 * Calculate tax with tax group and exemptions
 * @param amount - Base amount
 * @param taxGroup - Tax group to use
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
export const calculateTaxWithGroupAndExemptions = async (
  amount: number,
  taxGroup: TaxGroup,
  contactId: string | null,
  tenantId: string,
  schemaName: string
): Promise<TaxCalculationResult> => {
  if (!taxGroup.taxes || taxGroup.taxes.length === 0) {
    return {
      baseAmount: amount,
      taxAmount: 0,
      totalAmount: amount,
      effectiveRate: 0,
      taxBreakdown: [],
    }
  }

  return calculateTaxWithExemptions(
    amount,
    taxGroup.taxes,
    contactId,
    tenantId,
    schemaName
  )
}

/**
 * Calculate tax with individual taxes and exemptions
 * @param amount - Base amount
 * @param taxIds - Array of tax IDs to apply
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
export const calculateTaxWithTaxIds = async (
  amount: number,
  taxIds: string[],
  contactId: string | null,
  tenantId: string,
  schemaName: string
): Promise<TaxCalculationResult> => {
  return withTenantSchema(schemaName, async (trx) => {
    const { Tax } = await import('@models/Tax')

    // Fetch taxes
    const taxes = await Tax.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('active')
      .whereIn('id', taxIds)
      .orderBy('type', 'asc') // Order by type for proper compound tax calculation

    if (taxes.length !== taxIds.length) {
      throw new Error('One or more tax IDs are invalid')
    }

    return calculateTaxWithExemptions(
      amount,
      taxes,
      contactId,
      tenantId,
      schemaName
    )
  })
}

/**
 * Calculate tax with tax group ID and exemptions
 * @param amount - Base amount
 * @param taxGroupId - Tax group ID to use
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
export const calculateTaxWithGroupId = async (
  amount: number,
  taxGroupId: string,
  contactId: string | null,
  tenantId: string,
  schemaName: string
): Promise<TaxCalculationResult> => {
  const { findTaxGroupById } = await import('@queries/taxGroup.queries')
  const taxGroup = await findTaxGroupById(tenantId, schemaName, taxGroupId)

  return calculateTaxWithGroupAndExemptions(
    amount,
    taxGroup,
    contactId,
    tenantId,
    schemaName
  )
}
