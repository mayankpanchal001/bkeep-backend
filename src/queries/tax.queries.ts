import type { Knex } from 'knex'

import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { Tax, TaxType } from '@models/Tax'
import { calculateOffset } from '@schema/shared.schema'
import type { TaxListInput } from '@schema/tax.schema'
import { ApiError } from '@utils/ApiError'
import { getCurrentDate } from '@utils/date'
import { withTenantSchema } from '@utils/tenantQuery'

/**
 * Map sort field to database column
 */
const mapTaxSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    name: 'name',
    type: 'type',
    rate: 'rate',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'name'
}

/**
 * Find taxes with pagination, sorting, search, and filtering
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing taxes array and total count
 */
export const findTaxes = async (
  tenantId: string,
  schemaName: string,
  filters: TaxListInput
): Promise<{ taxes: Tax[]; total: number }> => {
  const {
    page,
    limit,
    sort = 'name',
    order = 'asc',
    search,
    isActive,
    type,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapTaxSortField(sort)

  return withTenantSchema(schemaName, async (trx) => {
    // Build base query
    let query = Tax.query(trx).modify('notDeleted')

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

    // Apply type filter if provided
    if (type) {
      query = query.modify('byType', type)
    }

    // Apply search if provided
    if (search) {
      query = query.where('name', 'ilike', `%${search}%`)
    }

    // Get total count before pagination
    const total = await query.resultSize()

    // Apply pagination and sorting
    const taxes = await query
      .orderBy(sortColumn, order)
      .limit(limit)
      .offset(offset)

    return { taxes, total }
  })
}

/**
 * Find tax by ID
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Tax object
 * @throws ApiError if tax not found
 */
export const findTaxById = async (
  tenantId: string,
  schemaName: string,
  taxId: string,
  trx?: Knex.Transaction
): Promise<Tax> => {
  const execute = async (transaction: Knex.Transaction) => {
    const tax = await Tax.query(transaction)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxId)

    if (!tax) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TAX_NOT_FOUND)
    }

    return tax
  }

  if (trx) {
    return execute(trx)
  }

  return withTenantSchema(schemaName, execute)
}

/**
 * Create a new tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param data - Tax data
 * @param createdBy - User ID who created the tax
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Created tax object
 */
export const createTax = async (
  tenantId: string,
  schemaName: string,
  data: {
    name: string
    type: TaxType
    rate: number
    isActive?: boolean
  },
  createdBy: string,
  trx?: Knex.Transaction
): Promise<Tax> => {
  const execute = async (transaction: Knex.Transaction) => {
    return Tax.query(transaction).insert({
      ...data,
      tenantId,
      createdBy,
      isActive: data.isActive ?? true,
    })
  }

  if (trx) {
    return execute(trx)
  }

  return withTenantSchema(schemaName, execute)
}

/**
 * Update a tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @param data - Tax data to update
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Updated tax object
 * @throws ApiError if tax not found
 */
export const updateTax = async (
  tenantId: string,
  schemaName: string,
  taxId: string,
  data: {
    name?: string
    type?: TaxType
    rate?: number
    isActive?: boolean
  },
  trx?: Knex.Transaction
): Promise<Tax> => {
  const execute = async (transaction: Knex.Transaction) => {
    // Verify tax exists and belongs to tenant
    await findTaxById(tenantId, schemaName, taxId, transaction)

    // Update tax
    return Tax.query(transaction).patchAndFetchById(taxId, data)
  }

  if (trx) {
    return execute(trx)
  }

  return withTenantSchema(schemaName, execute)
}

/**
 * Soft delete a tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @returns Deleted tax object
 * @throws ApiError if tax not found
 */
export const deleteTax = async (
  tenantId: string,
  schemaName: string,
  taxId: string
): Promise<Tax> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Verify tax exists and belongs to tenant
    await findTaxById(tenantId, schemaName, taxId, trx)

    // Soft delete using direct Knex update
    await trx('taxes').where('id', taxId).where('tenant_id', tenantId).update({
      deleted_at: getCurrentDate(),
      updated_at: getCurrentDate(),
    })

    // Reload tax to get updated deleted_at
    const deletedTax = await Tax.query(trx).findById(taxId)

    if (!deletedTax) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TAX_NOT_FOUND)
    }

    return deletedTax
  })
}

/**
 * Restore a soft-deleted tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @returns Restored tax object
 * @throws ApiError if tax not found or not deleted
 */
export const restoreTax = async (
  tenantId: string,
  schemaName: string,
  taxId: string
): Promise<Tax> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Find tax (including deleted ones)
    const tax = await Tax.query(trx)
      .modify('byTenant', tenantId)
      .findById(taxId)

    if (!tax) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TAX_NOT_FOUND)
    }

    if (!tax.deletedAt) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.TAX_NOT_DELETED
      )
    }

    // Tax is deleted, proceed with restoration

    // Restore using direct Knex update
    await trx('taxes').where('id', taxId).where('tenant_id', tenantId).update({
      deleted_at: null,
      updated_at: getCurrentDate(),
    })

    // Reload tax
    const restoredTax = await Tax.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .findById(taxId)

    if (!restoredTax) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TAX_NOT_FOUND)
    }

    return restoredTax
  })
}

/**
 * Update tax activation status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @param isActive - New activation status
 * @returns Updated tax object
 * @throws ApiError if tax not found
 */
export const updateTaxActivationStatus = async (
  tenantId: string,
  schemaName: string,
  taxId: string,
  isActive: boolean
): Promise<Tax> => {
  return updateTax(tenantId, schemaName, taxId, { isActive })
}

/**
 * Find active taxes
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @returns Array of active taxes
 */
export const findActiveTaxes = async (
  tenantId: string,
  schemaName: string
): Promise<Tax[]> => {
  return withTenantSchema(schemaName, async (trx) => {
    return Tax.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      .modify('active')
      .orderBy('name', 'asc')
  })
}

/**
 * Interface for tax statistics
 */
export interface TaxStatistics {
  total: number
  active: number
  inactive: number
  byType: {
    normal: number
    compound: number
    withholding: number
  }
  averageRate: number
  recentTaxes: Array<{
    id: string
    name: string
    type: string
    rate: number
    isActive: boolean
    createdAt: Date
  }>
}

/**
 * Get tax statistics
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @returns Tax statistics including counts, type distribution, and recent taxes
 */
export const getTaxStatistics = async (
  tenantId: string,
  schemaName: string
): Promise<TaxStatistics> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Base query
    const baseQuery = Tax.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)

    // Get total count
    const total = await baseQuery.clone().resultSize()

    // Get active count
    const active = await baseQuery.clone().modify('active').resultSize()

    // Get inactive count
    const inactive = total - active

    // Get counts by type
    const normalCount = await baseQuery
      .clone()
      .modify('byType', TaxType.NORMAL)
      .resultSize()

    const compoundCount = await baseQuery
      .clone()
      .modify('byType', TaxType.COMPOUND)
      .resultSize()

    const withholdingCount = await baseQuery
      .clone()
      .modify('byType', TaxType.WITHHOLDING)
      .resultSize()

    // Get average rate
    const ratesResult = await baseQuery
      .clone()
      .select(trx.raw('AVG(rate) as avg_rate'))
      .first()

    const averageRate = ratesResult
      ? Number.parseFloat(
          String(
            (ratesResult as unknown as { avg_rate?: string | number })
              .avg_rate ?? '0'
          )
        )
      : 0

    // Get recent taxes (last 5 created)
    const recentTaxesData = await baseQuery
      .clone()
      .orderBy('created_at', 'desc')
      .limit(5)
      .select(
        'id',
        'name',
        'type',
        'rate',
        'is_active as isActive',
        'created_at as createdAt'
      )

    const recentTaxes = recentTaxesData.map((tax) => ({
      id: tax.id,
      name: tax.name,
      type: tax.type,
      rate: tax.rate,
      isActive: (tax as unknown as { isActive: boolean }).isActive,
      createdAt: (tax as unknown as { createdAt: Date }).createdAt,
    }))

    return {
      total,
      active,
      inactive,
      byType: {
        normal: normalCount,
        compound: compoundCount,
        withholding: withholdingCount,
      },
      averageRate: Number.parseFloat(averageRate.toFixed(2)),
      recentTaxes,
    }
  })
}

/**
 * Get tax status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @returns Tax status information
 * @throws ApiError if tax not found
 */
export const getTaxStatus = async (
  tenantId: string,
  schemaName: string,
  taxId: string
): Promise<{
  id: string
  name: string
  type: string
  rate: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}> => {
  const tax = await findTaxById(tenantId, schemaName, taxId)

  return {
    id: tax.id,
    name: tax.name,
    type: tax.type,
    rate: tax.rate,
    isActive: tax.isActive,
    createdAt: tax.createdAt,
    updatedAt: tax.updatedAt,
  }
}
