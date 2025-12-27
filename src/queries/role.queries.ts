import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { Permission } from '@models/Permission'
import { Role } from '@models/Role'
import type { RoleListInput } from '@schema/role.schema'
import { calculateOffset } from '@schema/shared.schema'
import { ApiError } from '@utils/ApiError'

/**
 * Interface for role query result with pagination
 */
export interface RoleQueryResult {
  roles: Role[]
  total: number
}

/**
 * Map sort field to database column
 */
const mapSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    name: 'name',
    displayName: 'display_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }

  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'display_name'
}

/**
 * Find roles with pagination, sorting, search, and filtering
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing roles array and total count
 */
export const findRoles = async (
  filters: RoleListInput
): Promise<RoleQueryResult> => {
  const {
    page,
    limit,
    sort = 'displayName',
    order = 'asc',
    search,
    isActive,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapSortField(sort)

  // Build base query
  let query = Role.query()
    .modify('notDeleted')
    .where('name', '!=', 'superadmin')

  // Apply active filter if provided
  if (isActive !== undefined) {
    query = query.where('is_active', isActive)
  } else {
    // Default to active roles if not specified
    query = query.modify('active')
  }

  // Apply search if provided
  if (search) {
    query = query.modify('search', search)
  }

  // Get total count before pagination
  const total = await query.resultSize()

  // Apply pagination and sorting
  const roles = await query
    .orderBy(sortColumn, order)
    .limit(limit)
    .offset(offset)

  return { roles, total }
}

/**
 * Find role by ID
 * @param roleId - Role ID (UUID)
 * @returns Role object
 * @throws ApiError if role not found
 */
export const findRoleById = async (roleId: string): Promise<Role> => {
  const role = await Role.query().modify('notDeleted').findById(roleId)

  if (!role) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ROLE_NOT_FOUND)
  }

  return role
}

/**
 * Find role by ID with permissions (includes superadmin)
 * Returns role with its assigned permissions (only active, non-deleted)
 * @param roleId - Role ID (UUID)
 * @returns Role object with permissions
 * @throws ApiError if role not found
 */
export const findRoleByIdWithPermissions = async (
  roleId: string
): Promise<Role> => {
  const role = await Role.query()
    .modify('notDeleted')
    .findById(roleId)
    .withGraphFetched('permissions')
    .modifyGraph('permissions', (builder) => {
      builder.modify('notDeleted').modify('active')
    })

  if (!role) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ROLE_NOT_FOUND)
  }

  return role
}

/**
 * Interface for role statistics
 */
export interface RoleStatistics {
  total: number
  active: number
  inactive: number
  withPermissions: number
  withoutPermissions: number
  totalPermissions: number
  averagePermissionsPerRole: number
  recentRoles: Array<{
    id: string
    name: string
    displayName: string
    createdAt: Date
  }>
}

/**
 * Get role statistics and overview data
 * @returns Role statistics including counts, permissions data, and recent roles
 */
export const getRoleStatistics = async (): Promise<RoleStatistics> => {
  // Base query excluding superadmin and deleted roles
  const baseQuery = Role.query()
    .modify('notDeleted')
    .where('name', '!=', 'superadmin')

  // Get total count
  const total = await baseQuery.clone().resultSize()

  // Get active roles count
  const active = await baseQuery.clone().modify('active').resultSize()

  // Get inactive roles count
  const inactive = await baseQuery.clone().modify('inactive').resultSize()

  // Get roles with permissions count
  // Using joinRelated to count roles that have at least one permission
  const rolesWithPermissionsResult = await Role.query()
    .where('roles.deleted_at', null)
    .where('roles.name', '!=', 'superadmin')
    .joinRelated('permissions')
    .where('permissions.deleted_at', null)
    .where('permissions.is_active', true)
    .countDistinct('roles.id as count')
    .first()

  const rolesWithPermissions = Number.parseInt(
    String(
      (rolesWithPermissionsResult as unknown as { count?: string | number })
        ?.count ?? '0'
    ),
    10
  )

  // Get roles without permissions count
  const withoutPermissions = total - rolesWithPermissions

  // Get total permissions count across all roles
  // Count unique permissions assigned to roles (excluding superadmin)
  const totalPermissionsResult = await Role.query()
    .where('roles.deleted_at', null)
    .where('roles.name', '!=', 'superadmin')
    .joinRelated('permissions')
    .where('permissions.deleted_at', null)
    .where('permissions.is_active', true)
    .countDistinct('permissions.id as count')
    .first()

  const totalPermissions = Number.parseInt(
    String(
      (totalPermissionsResult as unknown as { count?: string | number })
        ?.count ?? '0'
    ),
    10
  )

  // Calculate average permissions per role
  const averagePermissionsPerRole =
    rolesWithPermissions > 0
      ? Number.parseFloat((totalPermissions / rolesWithPermissions).toFixed(2))
      : 0

  // Get recent roles (last 5 created, excluding superadmin)
  const recentRolesData = await Role.query()
    .modify('notDeleted')
    .where('name', '!=', 'superadmin')
    .orderBy('created_at', 'desc')
    .limit(5)
    .select(
      'id',
      'name',
      'display_name as displayName',
      'created_at as createdAt'
    )

  const recentRoles = recentRolesData.map((role) => ({
    id: role.id,
    name: role.name,
    displayName: (role as { displayName: string }).displayName,
    createdAt: (role as { createdAt: Date }).createdAt,
  }))

  return {
    total,
    active,
    inactive,
    withPermissions: rolesWithPermissions,
    withoutPermissions,
    totalPermissions,
    averagePermissionsPerRole,
    recentRoles,
  }
}

/**
 * Update role permissions
 * Replaces all permissions for a role with the provided permission IDs
 * @param roleId - Role ID (UUID)
 * @param permissionIds - Array of permission IDs to assign to the role
 * @returns Updated role with permissions
 * @throws ApiError if role not found or permission IDs are invalid
 */
export const updateRolePermissions = async (
  roleId: string,
  permissionIds: string[]
): Promise<Role> => {
  // Find role
  const role = await Role.query().modify('notDeleted').findById(roleId)

  if (!role) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ROLE_NOT_FOUND)
  }

  // Validate all permission IDs exist and are active
  if (permissionIds.length > 0) {
    const permissions = await Permission.query()
      .modify('notDeleted')
      .modify('active')
      .whereIn('id', permissionIds)

    if (permissions.length !== permissionIds.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'One or more permission IDs are invalid, inactive, or deleted'
      )
    }
  }

  // Sync permissions (replace all existing permissions with new ones)
  await role.syncPermissions(permissionIds)

  // Return updated role with permissions
  return findRoleByIdWithPermissions(roleId)
}
