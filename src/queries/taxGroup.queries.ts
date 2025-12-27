import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { Tax } from '@models/Tax'
import { TaxGroup } from '@models/TaxGroup'
import { TaxGroupTax } from '@models/TaxGroupTax'
import { calculateOffset } from '@schema/shared.schema'
import type { TaxGroupListInput } from '@schema/taxGroup.schema'
import { ApiError } from '@utils/ApiError'
import { getCurrentDate } from '@utils/date'
import { withTenantSchema } from '@utils/tenantQuery'

/**
 * Map sort field to database column
 */
const mapTaxGroupSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    name: 'name',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'name'
}

/**
 * Find tax groups with pagination, sorting, search, and filtering
 */
export const findTaxGroups = async (
  tenantId: string,
  schemaName: string,
  filters: TaxGroupListInput
): Promise<{ taxGroups: TaxGroup[]; total: number }> => {
  const {
    page,
    limit,
    sort = 'name',
    order = 'asc',
    search,
    isActive,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapTaxGroupSortField(sort)

  return withTenantSchema(schemaName, async (trx) => {
    // Build base query
    let query = TaxGroup.query(trx).modify('notDeleted')

    // Filter by tenant
    query = query.modify('byTenant', tenantId)

    // Apply active filter if provided
    if (isActive !== undefined) {
      if (isActive) {
        query = query.modify('active')
      } else {
        query = query.where('is_active', false)
      }
    }

    // Apply search if provided
    if (search) {
      query = query.where('name', 'ilike', `%${search}%`)
    }

    // Get total count before pagination
    const total = await query.resultSize()

    // Apply pagination and sorting
    const taxGroups = await query
      .orderBy(sortColumn, order)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('taxes')

    return { taxGroups, total }
  })
}

/**
 * Find tax group by ID with taxes
 */
export const findTaxGroupById = async (
  tenantId: string,
  schemaName: string,
  taxGroupId: string
): Promise<TaxGroup> => {
  return withTenantSchema(schemaName, async (trx) => {
    const taxGroup = await TaxGroup.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxGroupId)
      .withGraphFetched('taxes')

    if (!taxGroup) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.TAX_GROUP_NOT_FOUND
      )
    }

    return taxGroup
  })
}

/**
 * Create tax group with taxes
 */
export const createTaxGroup = async (
  tenantId: string,
  schemaName: string,
  data: {
    name: string
    description?: string
    isActive?: boolean
    taxIds: string[]
  },
  createdBy: string
): Promise<TaxGroup> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Validate all taxes exist and belong to tenant
    const taxes = await Tax.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .whereIn('id', data.taxIds)

    if (taxes.length !== data.taxIds.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_TAX_IDS
      )
    }

    // Create tax group
    const taxGroup = await TaxGroup.query(trx).insertAndFetch({
      tenantId,
      name: data.name,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      createdBy,
    })

    // Create tax group tax relationships
    const taxGroupTaxes = data.taxIds.map((taxId, index) => ({
      taxGroupId: taxGroup.id,
      taxId,
      orderIndex: index,
    }))

    await TaxGroupTax.query(trx).insert(taxGroupTaxes)

    // Reload with taxes
    const reloadedTaxGroup = await TaxGroup.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxGroup.id)
      .withGraphFetched('taxes')

    if (!reloadedTaxGroup) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.TAX_GROUP_NOT_FOUND
      )
    }

    return reloadedTaxGroup
  })
}

/**
 * Update tax group
 */
export const updateTaxGroup = async (
  tenantId: string,
  schemaName: string,
  taxGroupId: string,
  data: {
    name?: string
    description?: string
    isActive?: boolean
    taxIds?: string[]
  }
): Promise<TaxGroup> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify tax group exists
    const existingGroup = await TaxGroup.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxGroupId)

    if (!existingGroup) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.TAX_GROUP_NOT_FOUND
      )
    }

    // Update tax group fields
    const updateData: Partial<TaxGroup> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined)
      updateData.description = data.description
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    if (Object.keys(updateData).length > 0) {
      await TaxGroup.query(trx).findById(taxGroupId).patch(updateData)
    }

    // Update taxes if provided
    if (data.taxIds !== undefined) {
      // Validate all taxes exist and belong to tenant
      const taxes = await Tax.query(trx)
        .modify('notDeleted')
        .modify('byTenant', tenantId)
        .whereIn('id', data.taxIds)

      if (taxes.length !== data.taxIds.length) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.INVALID_TAX_IDS
        )
      }

      // Delete existing relationships
      await TaxGroupTax.query(trx).where('tax_group_id', taxGroupId).delete()

      // Create new relationships
      const taxGroupTaxes = data.taxIds.map((taxId, index) => ({
        taxGroupId,
        taxId,
        orderIndex: index,
      }))

      await TaxGroupTax.query(trx).insert(taxGroupTaxes)
    }

    // Reload with taxes within the same transaction
    const reloadedTaxGroup = await TaxGroup.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxGroupId)
      .withGraphFetched('taxes')

    if (!reloadedTaxGroup) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.TAX_GROUP_NOT_FOUND
      )
    }

    return reloadedTaxGroup
  })
}

/**
 * Delete tax group (soft delete)
 */
export const deleteTaxGroup = async (
  tenantId: string,
  schemaName: string,
  taxGroupId: string
): Promise<TaxGroup> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify tax group exists
    await findTaxGroupById(tenantId, schemaName, taxGroupId)

    // Soft delete
    await trx('tax_groups')
      .where('id', taxGroupId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: getCurrentDate(),
        updated_at: getCurrentDate(),
      })

    // Reload without notDeleted modifier
    const deletedGroup = await TaxGroup.query(trx).findById(taxGroupId)
    return deletedGroup as TaxGroup
  })
}

/**
 * Restore tax group
 */
export const restoreTaxGroup = async (
  tenantId: string,
  schemaName: string,
  taxGroupId: string
): Promise<TaxGroup> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Find deleted tax group
    const taxGroup = await TaxGroup.query(trx)
      .modify('deleted')
      .modify('byTenant', tenantId)
      .findById(taxGroupId)

    if (!taxGroup) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.TAX_GROUP_NOT_FOUND
      )
    }

    // Restore
    await trx('tax_groups')
      .where('id', taxGroupId)
      .where('tenant_id', tenantId)
      .update({
        deleted_at: null,
        updated_at: getCurrentDate(),
        is_active: true,
      })

    // Reload within the same transaction
    const restoredTaxGroup = await TaxGroup.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxGroupId)
      .withGraphFetched('taxes')

    if (!restoredTaxGroup) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.TAX_GROUP_NOT_FOUND
      )
    }

    return restoredTaxGroup
  })
}

/**
 * Update tax group activation status
 */
export const updateTaxGroupActivationStatus = async (
  tenantId: string,
  schemaName: string,
  taxGroupId: string,
  isActive: boolean
): Promise<TaxGroup> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify tax group exists
    await findTaxGroupById(tenantId, schemaName, taxGroupId)

    // Update status
    await TaxGroup.query(trx).findById(taxGroupId).patch({
      isActive,
    })

    // Reload
    return findTaxGroupById(tenantId, schemaName, taxGroupId)
  })
}

/**
 * Find active tax groups
 */
export const findActiveTaxGroups = async (
  tenantId: string,
  schemaName: string
): Promise<TaxGroup[]> => {
  return withTenantSchema(schemaName, async (trx) => {
    return TaxGroup.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('active')
      .withGraphFetched('taxes')
      .orderBy('name', 'asc')
  })
}

/**
 * Calculate tax with tax group
 */
export const calculateTaxWithGroup = async (
  tenantId: string,
  schemaName: string,
  taxGroupId: string,
  amount: number
): Promise<{
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
}> => {
  const taxGroup = await findTaxGroupById(tenantId, schemaName, taxGroupId)

  if (!taxGroup.taxes || taxGroup.taxes.length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.TAX_GROUP_HAS_NO_TAXES
    )
  }

  const taxAmount = taxGroup.calculateTax(amount)
  const totalAmount = amount + taxAmount
  const effectiveRate = taxGroup.getEffectiveRate()

  // Build tax breakdown
  let currentAmount = amount
  const taxBreakdown = taxGroup.taxes.map((tax) => {
    const individualTaxAmount = tax.calculateTax(currentAmount)
    const result = {
      taxId: tax.id,
      taxName: tax.name,
      taxRate: tax.rate,
      taxAmount: individualTaxAmount,
    }

    // For compound taxes, add tax to base for next calculation
    if (tax.type === 'compound') {
      currentAmount += individualTaxAmount
    }

    return result
  })

  return {
    baseAmount: amount,
    taxAmount,
    totalAmount,
    effectiveRate,
    taxBreakdown,
  }
}
