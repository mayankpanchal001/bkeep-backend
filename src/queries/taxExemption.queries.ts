import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { TaxExemption, TaxExemptionType } from '@models/TaxExemption'
import { calculateOffset } from '@schema/shared.schema'
import type { TaxExemptionListInput } from '@schema/taxExemption.schema'
import { ApiError } from '@utils/ApiError'
import { getCurrentDate } from '@utils/date'
import { withTenantSchema } from '@utils/tenantQuery'

/**
 * Map sort field to database column
 */
const mapTaxExemptionSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    exemptionType: 'exemption_type',
    certificateExpiry: 'certificate_expiry',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'created_at'
}

/**
 * Find tax exemptions with pagination, sorting, search, and filtering
 */
export const findTaxExemptions = async (
  tenantId: string,
  schemaName: string,
  filters: TaxExemptionListInput
): Promise<{ taxExemptions: TaxExemption[]; total: number }> => {
  const {
    page,
    limit,
    sort = 'createdAt',
    order = 'asc',
    search,
    isActive,
    contactId,
    taxId,
    exemptionType,
    expired,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapTaxExemptionSortField(sort)

  return withTenantSchema(schemaName, async (trx) => {
    // Build base query
    let query = TaxExemption.query(trx).modify('notDeleted')

    // Filter by tenant
    query = query.modify('byTenant', tenantId)

    // Apply contact filter if provided
    if (contactId) {
      query = query.modify('byContact', contactId)
    }

    // Apply tax filter if provided
    if (taxId) {
      query = query.modify('byTax', taxId)
    }

    // Apply exemption type filter if provided
    if (exemptionType) {
      query = query.where('exemption_type', exemptionType)
    }

    // Apply active filter if provided
    if (isActive !== undefined) {
      if (isActive) {
        query = query.modify('active')
      } else {
        query = query.where('is_active', false)
      }
    }

    // Apply expired filter if provided
    if (expired !== undefined) {
      if (expired) {
        query = query.where('certificate_expiry', '<', new Date())
      } else {
        query = query.modify('notExpired')
      }
    }

    // Apply search if provided (searches in certificate number and reason)
    if (search) {
      query = query.where((builder) => {
        builder
          .where('certificate_number', 'ilike', `%${search}%`)
          .orWhere('reason', 'ilike', `%${search}%`)
      })
    }

    // Get total count before pagination
    const total = await query.resultSize()

    // Apply pagination and sorting
    const taxExemptions = await query
      .withGraphFetched('tax')
      .orderBy(sortColumn, order)
      .limit(limit)
      .offset(offset)

    return { taxExemptions, total }
  })
}

/**
 * Find tax exemption by ID
 */
export const findTaxExemptionById = async (
  tenantId: string,
  schemaName: string,
  taxExemptionId: string
): Promise<TaxExemption> => {
  return withTenantSchema(schemaName, async (trx) => {
    const taxExemption = await TaxExemption.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxExemptionId)
      .withGraphFetched('tax')

    if (!taxExemption) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.TAX_EXEMPTION_NOT_FOUND
      )
    }

    return taxExemption
  })
}

/**
 * Find tax exemptions by contact
 */
export const findTaxExemptionsByContact = async (
  tenantId: string,
  schemaName: string,
  contactId: string
): Promise<TaxExemption[]> => {
  return withTenantSchema(schemaName, async (trx) => {
    return TaxExemption.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('byContact', contactId)
      .modify('active')
      .modify('notExpired')
      .withGraphFetched('tax')
      .orderBy('created_at', 'desc')
  })
}

/**
 * Check if contact is exempt from a specific tax
 */
export const isContactExemptFromTax = async (
  tenantId: string,
  schemaName: string,
  contactId: string,
  taxId: string
): Promise<boolean> => {
  return withTenantSchema(schemaName, async (trx) => {
    const exemption = await TaxExemption.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('byContact', contactId)
      .modify('active')
      .modify('notExpired')
      .where((builder) => {
        builder.whereNull('tax_id').orWhere('tax_id', taxId)
      })
      .first()

    return exemption !== undefined
  })
}

/**
 * Create tax exemption
 */
export const createTaxExemption = async (
  tenantId: string,
  schemaName: string,
  data: {
    contactId: string
    taxId?: string | null
    exemptionType: TaxExemptionType
    certificateNumber?: string
    certificateExpiry?: string | null
    reason?: string
    isActive?: boolean
  },
  createdBy: string
): Promise<TaxExemption> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Validate tax exists if taxId is provided
    if (data.taxId) {
      const { findTaxById } = await import('@queries/tax.queries')
      await findTaxById(tenantId, schemaName, data.taxId, trx)
    }

    // Create tax exemption
    const taxExemption = await TaxExemption.query(trx).insertAndFetch({
      tenantId,
      contactId: data.contactId,
      taxId: data.taxId ?? null,
      exemptionType: data.exemptionType,
      certificateNumber: data.certificateNumber ?? null,
      certificateExpiry: data.certificateExpiry
        ? new Date(data.certificateExpiry)
        : null,
      reason: data.reason ?? null,
      isActive: data.isActive ?? true,
      createdBy,
    })

    // Reload with tax relation
    return findTaxExemptionById(tenantId, schemaName, taxExemption.id)
  })
}

/**
 * Update tax exemption
 */
export const updateTaxExemption = async (
  tenantId: string,
  schemaName: string,
  taxExemptionId: string,
  data: {
    taxId?: string | null
    exemptionType?: TaxExemptionType
    certificateNumber?: string
    certificateExpiry?: string | null
    reason?: string
    isActive?: boolean
  }
): Promise<TaxExemption> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify tax exemption exists
    await findTaxExemptionById(tenantId, schemaName, taxExemptionId)

    // Validate tax exists if taxId is provided
    if (data.taxId !== undefined && data.taxId !== null) {
      const { findTaxById } = await import('@queries/tax.queries')
      await findTaxById(tenantId, schemaName, data.taxId, trx)
    }

    // Update tax exemption
    const updateData: Partial<TaxExemption> = {}
    if (data.taxId !== undefined) updateData.taxId = data.taxId
    if (data.exemptionType !== undefined)
      updateData.exemptionType = data.exemptionType
    if (data.certificateNumber !== undefined)
      updateData.certificateNumber = data.certificateNumber ?? null
    if (data.certificateExpiry !== undefined)
      updateData.certificateExpiry = data.certificateExpiry
        ? new Date(data.certificateExpiry)
        : null
    if (data.reason !== undefined) updateData.reason = data.reason ?? null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    await TaxExemption.query(trx).findById(taxExemptionId).patch(updateData)

    // Reload
    return findTaxExemptionById(tenantId, schemaName, taxExemptionId)
  })
}

/**
 * Delete tax exemption (soft delete)
 */
export const deleteTaxExemption = async (
  tenantId: string,
  schemaName: string,
  taxExemptionId: string
): Promise<TaxExemption> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify tax exemption exists
    await findTaxExemptionById(tenantId, schemaName, taxExemptionId)

    // Soft delete
    await trx('tax_exemptions')
      .where('id', taxExemptionId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: getCurrentDate(),
        updated_at: getCurrentDate(),
      })

    // Reload without notDeleted modifier
    const deletedExemption =
      await TaxExemption.query(trx).findById(taxExemptionId)
    return deletedExemption as TaxExemption
  })
}

/**
 * Restore tax exemption
 */
export const restoreTaxExemption = async (
  tenantId: string,
  schemaName: string,
  taxExemptionId: string
): Promise<TaxExemption> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Find deleted tax exemption
    const taxExemption = await TaxExemption.query(trx)
      .modify('deleted')
      .modify('byTenant', tenantId)
      .findById(taxExemptionId)

    if (!taxExemption) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.TAX_EXEMPTION_NOT_FOUND
      )
    }

    // Restore
    await trx('tax_exemptions')
      .where('id', taxExemptionId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: null,
        updated_at: getCurrentDate(),
        is_active: true,
      })

    // Reload
    return findTaxExemptionById(tenantId, schemaName, taxExemptionId)
  })
}

/**
 * Update tax exemption activation status
 */
export const updateTaxExemptionActivationStatus = async (
  tenantId: string,
  schemaName: string,
  taxExemptionId: string,
  isActive: boolean
): Promise<TaxExemption> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify tax exemption exists
    await findTaxExemptionById(tenantId, schemaName, taxExemptionId)

    // Update status
    await TaxExemption.query(trx).findById(taxExemptionId).patch({
      isActive,
    })

    // Reload
    return findTaxExemptionById(tenantId, schemaName, taxExemptionId)
  })
}
