import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { PAGINATION_DEFAULTS } from '@constants/pagination'
import { Tenant } from '@models/Tenant'
import { UserRole } from '@models/UserRole'
import { UserTenant } from '@models/UserTenant'
import { calculateOffset } from '@schema/shared.schema'
import type { TenantListInput } from '@schema/tenant.schema'
import { ApiError } from '@utils/ApiError'

/**
 * Interface for tenant query result with pagination
 */
export interface TenantQueryResult {
  tenants: Tenant[]
  total: number
}

/**
 * Map sort field to database column
 */
const mapSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    name: 'name',
    schemaName: 'schema_name',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }

  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'created_at'
}

/**
 * Find tenants with pagination, sorting, search, and filtering
 * @param filters - Filter, pagination, and sorting parameters
 * @param userId - Optional user ID to filter tenants by user membership
 * @returns Object containing tenants array and total count
 */
export const findTenants = async (
  filters: TenantListInput,
  userId?: string
): Promise<TenantQueryResult> => {
  const {
    page = PAGINATION_DEFAULTS.PAGE_DEFAULT,
    limit = PAGINATION_DEFAULTS.LIMIT_DEFAULT,
    sort = 'createdAt',
    order = 'asc',
    search,
    isActive,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapSortField(sort)

  // Build base query
  let query = Tenant.query().modify('notDeleted')

  // Filter by user membership if userId is provided
  if (userId) {
    query = query
      .join('user_tenants', 'tenants.id', 'user_tenants.tenant_id')
      .where('user_tenants.user_id', userId)
      .groupBy('tenants.id')
  }

  // Apply active filter if provided
  if (isActive !== undefined) {
    if (isActive) {
      query = query.modify('active')
    } else {
      query = query.modify('inactive')
    }
  }

  // Apply search if provided
  if (search) {
    query = query.modify('search', search)
  }

  // Get total count before pagination
  const total = await query.resultSize()

  // Apply pagination and sorting
  const tenants = await query
    .orderBy(sortColumn, order)
    .limit(limit)
    .offset(offset)

  return { tenants, total }
}

/**
 * Find tenant by ID
 * @param tenantId - Tenant ID (UUID)
 * @returns Tenant object
 * @throws ApiError if tenant not found
 */
export const findTenantById = async (tenantId: string): Promise<Tenant> => {
  const tenant = await Tenant.query().modify('notDeleted').findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  return tenant
}

/**
 * Find tenant by schema name
 * @param schemaName - Schema name
 * @returns Tenant object or undefined
 */
export const findTenantBySchemaName = async (
  schemaName: string
): Promise<Tenant | undefined> => {
  return Tenant.findBySchemaName(schemaName)
}

/**
 * Create tenant
 * @param data - Tenant data
 * @returns Created tenant
 */
export const createTenant = async (data: {
  name: string
  schemaName: string
  isActive?: boolean
}): Promise<Tenant> => {
  // Check if schema name already exists
  const existingTenant = await findTenantBySchemaName(data.schemaName)
  if (existingTenant) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_MESSAGES.TENANT_SCHEMA_ALREADY_EXISTS
    )
  }

  const tenant = await Tenant.query().insert({
    name: data.name,
    schemaName: data.schemaName,
    isActive: data.isActive ?? true,
  })

  return tenant
}

/**
 * Update tenant
 * @param tenantId - Tenant ID
 * @param data - Update data
 * @returns Updated tenant
 */
export const updateTenant = async (
  tenantId: string,
  data: {
    name?: string
    isActive?: boolean
  }
): Promise<Tenant> => {
  const tenant = await findTenantById(tenantId)

  const updatedTenant = await tenant.$query().patchAndFetch(data)

  return updatedTenant
}

/**
 * Delete tenant (soft delete)
 * @param tenantId - Tenant ID
 * @returns Deleted tenant
 */
export const deleteTenant = async (tenantId: string): Promise<Tenant> => {
  const tenant = await findTenantById(tenantId)

  // Soft delete the tenant
  await tenant.softDelete()

  // Reload the tenant directly (without notDeleted modifier) to get the updated data
  const deletedTenant = await Tenant.query().findById(tenantId)

  if (!deletedTenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  return deletedTenant
}

/**
 * Restore tenant (un-soft delete)
 * @param tenantId - Tenant ID
 * @returns Restored tenant
 */
export const restoreTenant = async (tenantId: string): Promise<Tenant> => {
  const tenant = await Tenant.query()
    .where('id', tenantId)
    .whereNotNull('deleted_at')
    .first()

  if (!tenant) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      ERROR_MESSAGES.TENANT_NOT_FOUND_OR_NOT_DELETED
    )
  }

  // Restore the tenant
  await tenant.restore()

  // Reload to get updated data
  const restoredTenant = await Tenant.query().findById(tenantId)

  if (!restoredTenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  return restoredTenant
}

/**
 * Associate user with tenant
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @param isPrimary - Whether this is the primary tenant for the user
 * @returns void
 */
export const associateUserWithTenant = async (
  userId: string,
  tenantId: string,
  isPrimary: boolean = false
): Promise<void> => {
  // Check if association already exists
  const existing = await UserTenant.query()
    .where('userId', userId)
    .where('tenantId', tenantId)
    .first()

  if (existing) {
    // Update is_primary if needed
    if (existing.isPrimary !== isPrimary) {
      await existing.$query().patch({ isPrimary })
    }
    return
  }

  // If this is primary, unset other primary tenants for this user
  if (isPrimary) {
    await UserTenant.query()
      .where('userId', userId)
      .where('isPrimary', true)
      .patch({ isPrimary: false })
  }

  // Create association
  await UserTenant.query().insert({
    userId: userId,
    tenantId: tenantId,
    isPrimary: isPrimary,
  })
}

/**
 * Switch user's primary tenant
 * Updates is_primary flag in user_tenants table
 * @param userId - User ID
 * @param tenantId - Tenant ID to switch to
 * @returns void
 * @throws ApiError if user doesn't belong to tenant
 */
export const switchUserTenant = async (
  userId: string,
  tenantId: string
): Promise<void> => {
  // Verify user belongs to tenant
  const userTenant = await UserTenant.findByUserAndTenant(userId, tenantId)

  if (!userTenant) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.UNAUTHORIZED_ACCESS
    )
  }

  // If already primary, no need to update
  if (userTenant.isPrimary) {
    return
  }

  // Unset all other primary tenants for this user
  await UserTenant.query()
    .where('user_id', userId)
    .where('is_primary', true)
    .patch({ isPrimary: false })

  // Set this tenant as primary
  await userTenant.$query().patch({ isPrimary: true })
}

/**
 * Assign role to user for tenant
 * @param userId - User ID
 * @param roleId - Role ID
 * @param tenantId - Tenant ID
 * @returns void
 */
export const assignRoleToUserForTenant = async (
  userId: string,
  roleId: string,
  tenantId: string
): Promise<void> => {
  // Assign role using UserRole model (idempotent)
  await UserRole.assignRole(userId, roleId, tenantId)
}
