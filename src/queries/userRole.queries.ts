import type {
  AssignRoleInput,
  RemoveRoleInput,
  SyncUserRolesInput,
  UserRolesByTenant,
  UserRoleWithDetails,
  UserRoleWithRole,
  UserRoleWithUser,
} from '@/types/userRole.type'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { ROLES } from '@constants/roles'
import { Role } from '@models/Role'
import { Tenant } from '@models/Tenant'
import { User } from '@models/User'
import { UserRole } from '@models/UserRole'
import { UserTenant } from '@models/UserTenant'
import { ApiError } from '@utils/ApiError'

/**
 * Find all roles for a user in a specific tenant
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @returns Array of UserRole with role details
 */
export const findUserRolesInTenant = async (
  userId: string,
  tenantId: string
): Promise<UserRoleWithRole[]> => {
  // Verify user exists and is active
  const user = await User.query()
    .modify('notDeleted')
    .modify('active')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Verify tenant exists and is active
  const tenant = await Tenant.query()
    .modify('notDeleted')
    .modify('active')
    .findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Get user roles in tenant with role details
  const userRoles = (await UserRole.findByUserAndTenant(
    userId,
    tenantId
  )) as UserRoleWithRole[]

  return userRoles
}

/**
 * Find all roles for a user across all tenants
 * @param userId - User ID
 * @returns Object with roles grouped by tenant
 */
export const findAllUserRoles = async (
  userId: string
): Promise<UserRolesByTenant> => {
  // Verify user exists
  const user = await User.query()
    .modify('notDeleted')
    .modify('active')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Get all user roles with role and tenant details
  const userRoles = (await UserRole.findByUser(userId)) as UserRoleWithDetails[]

  // Group roles by tenant
  const rolesByTenant: UserRolesByTenant = {}

  for (const userRole of userRoles) {
    // Skip if relations not loaded
    if (!userRole.tenant || !userRole.role) continue

    rolesByTenant[userRole.tenantId] ??= {
      tenantId: userRole.tenant.id,
      tenantName: userRole.tenant.name,
      schemaName: userRole.tenant.schemaName,
      roles: [],
    }

    rolesByTenant[userRole.tenantId]?.roles.push({
      roleId: userRole.role.id,
      roleName: userRole.role.name,
      roleDisplayName: userRole.role.displayName,
      assignedAt: userRole.createdAt,
    })
  }

  return rolesByTenant
}

/**
 * Find all users with a specific role in a tenant
 * @param roleId - Role ID
 * @param tenantId - Tenant ID
 * @returns Array of UserRole with user details
 */
export const findUsersWithRoleInTenant = async (
  roleId: string,
  tenantId: string
): Promise<UserRoleWithUser[]> => {
  // Verify role exists
  const role = await Role.query()
    .modify('notDeleted')
    .modify('active')
    .findById(roleId)

  if (!role) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ROLE_NOT_FOUND)
  }

  // Verify tenant exists
  const tenant = await Tenant.query()
    .modify('notDeleted')
    .modify('active')
    .findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Get users with this role in tenant
  const userRoles = (await UserRole.findByRoleAndTenant(
    roleId,
    tenantId
  )) as UserRoleWithUser[]

  return userRoles
}

/**
 * Check if a user has a specific role in a tenant
 * @param userId - User ID
 * @param roleId - Role ID
 * @param tenantId - Tenant ID
 * @returns boolean
 */
export const checkUserHasRole = async (
  userId: string,
  roleId: string,
  tenantId: string
): Promise<boolean> => {
  return UserRole.hasRole(userId, roleId, tenantId)
}

/**
 * Assign a role to a user in a tenant
 * @param input - Assignment input (userId, roleId, tenantId)
 * @returns Created UserRole
 */
export const assignRoleToUser = async (
  input: AssignRoleInput
): Promise<UserRole> => {
  const { userId, roleId, tenantId } = input

  // Verify user exists and is active
  const user = await User.query()
    .modify('notDeleted')
    .modify('active')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Verify role exists and is active
  const role = await Role.query()
    .modify('notDeleted')
    .modify('active')
    .findById(roleId)

  if (!role) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ROLE_NOT_FOUND)
  }

  // Check if role is superadmin (cannot be assigned via this method)
  if (role.name === ROLES.SUPERADMIN) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.CANNOT_ASSIGN_SUPERADMIN_ROLE
    )
  }

  // Verify tenant exists and is active
  const tenant = await Tenant.query()
    .modify('notDeleted')
    .modify('active')
    .findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Verify user is a member of the tenant using helper method
  const isMember = await UserTenant.isMember(userId, tenantId)

  if (!isMember) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.USER_NOT_MEMBER_OF_TENANT
    )
  }

  // Assign role
  return UserRole.assignRole(userId, roleId, tenantId)
}

/**
 * Remove a role from a user in a tenant
 * @param input - Removal input (userId, roleId, tenantId)
 * @returns Number of deleted rows
 */
export const removeRoleFromUser = async (
  input: RemoveRoleInput
): Promise<void> => {
  const { userId, roleId, tenantId } = input

  // Verify user exists
  const user = await User.query()
    .modify('notDeleted')
    .modify('active')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Verify role exists
  const role = await Role.query()
    .modify('notDeleted')
    .modify('active')
    .findById(roleId)

  if (!role) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ROLE_NOT_FOUND)
  }

  // Verify tenant exists
  const tenant = await Tenant.query()
    .modify('notDeleted')
    .modify('active')
    .findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Check if role assignment exists
  const hasRole = await UserRole.hasRole(userId, roleId, tenantId)

  if (!hasRole) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'User does not have this role in the specified tenant'
    )
  }

  // Remove role
  await UserRole.removeRole(userId, roleId, tenantId)
}

/**
 * Remove all roles from a user in a tenant
 * @param userId - User ID
 * @param tenantId - Tenant ID
 */
export const removeAllUserRolesInTenant = async (
  userId: string,
  tenantId: string
): Promise<void> => {
  // Verify user exists
  const user = await User.query()
    .modify('notDeleted')
    .modify('active')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Verify tenant exists
  const tenant = await Tenant.query()
    .modify('notDeleted')
    .modify('active')
    .findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Remove all roles
  await UserRole.removeAllUserRolesInTenant(userId, tenantId)
}

/**
 * Sync user roles in a tenant (replace all roles with the given ones)
 * @param input - Sync input (userId, tenantId, roleIds)
 */
export const syncUserRolesInTenant = async (
  input: SyncUserRolesInput
): Promise<UserRoleWithRole[]> => {
  const { userId, tenantId, roleIds } = input

  // Verify user exists and is active
  const user = await User.query()
    .modify('notDeleted')
    .modify('active')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Verify tenant exists and is active
  const tenant = await Tenant.query()
    .modify('notDeleted')
    .modify('active')
    .findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Verify user is a member of the tenant using helper method
  const isMember = await UserTenant.isMember(userId, tenantId)

  if (!isMember) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.USER_NOT_MEMBER_OF_TENANT
    )
  }

  // Validate all role IDs exist and are active
  if (roleIds.length > 0) {
    const roles = await Role.query()
      .modify('notDeleted')
      .modify('active')
      .whereIn('id', roleIds)

    if (roles.length !== roleIds.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_ROLE_IDS
      )
    }

    // Check if any role is superadmin
    const hasSuperAdminRole = roles.some(
      (role) => role.name === ROLES.SUPERADMIN
    )

    if (hasSuperAdminRole) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.CANNOT_ASSIGN_SUPERADMIN_ROLE
      )
    }
  }

  // Sync roles
  await UserRole.syncUserRolesInTenant(userId, tenantId, roleIds)

  // Return updated user roles
  return findUserRolesInTenant(userId, tenantId)
}

/**
 * Check if user has any of the specified roles in a tenant
 * @param userId - User ID
 * @param roleNames - Array of role names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
export const userHasAnyRole = async (
  userId: string,
  roleNames: string[],
  tenantId: string
): Promise<boolean> => {
  const userRoles = await findUserRolesInTenant(userId, tenantId)

  return userRoles.some((ur) => roleNames.includes(ur.role.name))
}

/**
 * Check if user has all specified roles in a tenant
 * @param userId - User ID
 * @param roleNames - Array of role names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
export const userHasAllRoles = async (
  userId: string,
  roleNames: string[],
  tenantId: string
): Promise<boolean> => {
  const userRoles = await findUserRolesInTenant(userId, tenantId)
  const userRoleNames = userRoles.map((ur) => ur.role.name)

  return roleNames.every((roleName) => userRoleNames.includes(roleName))
}

/**
 * Get user's permissions in a tenant (via roles)
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @returns Array of unique permission names
 */
export const getUserPermissionsInTenant = async (
  userId: string,
  tenantId: string
): Promise<string[]> => {
  // Get user roles with permissions
  const userRoles = await UserRole.query()
    .where('user_id', userId)
    .where('tenant_id', tenantId)
    .withGraphFetched('role.permissions')

  // Extract unique permission names
  const permissionSet = new Set<string>()

  for (const userRole of userRoles) {
    if (userRole.role?.permissions) {
      for (const permission of userRole.role.permissions) {
        if (permission.isActive) {
          permissionSet.add(permission.name)
        }
      }
    }
  }

  return Array.from(permissionSet)
}

/**
 * Check if user has a specific permission in a tenant
 * @param userId - User ID
 * @param permissionName - Permission name to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
export const userHasPermission = async (
  userId: string,
  permissionName: string,
  tenantId: string
): Promise<boolean> => {
  const permissions = await getUserPermissionsInTenant(userId, tenantId)
  return permissions.includes(permissionName)
}

/**
 * Check if user has any of the specified permissions in a tenant
 * @param userId - User ID
 * @param permissionNames - Array of permission names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
export const userHasAnyPermission = async (
  userId: string,
  permissionNames: string[],
  tenantId: string
): Promise<boolean> => {
  const permissions = await getUserPermissionsInTenant(userId, tenantId)
  return permissionNames.some((perm) => permissions.includes(perm))
}

/**
 * Check if user has all specified permissions in a tenant
 * @param userId - User ID
 * @param permissionNames - Array of permission names to check
 * @param tenantId - Tenant ID
 * @returns boolean
 */
export const userHasAllPermissions = async (
  userId: string,
  permissionNames: string[],
  tenantId: string
): Promise<boolean> => {
  const permissions = await getUserPermissionsInTenant(userId, tenantId)
  return permissionNames.every((perm) => permissions.includes(perm))
}

/**
 * Get complete user-tenant-role-permissions relationship
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @returns Complete relationship data with roles and permissions
 */
export const getUserTenantRolePermissions = async (
  userId: string,
  tenantId: string
) => {
  // Verify user exists
  const user = await User.query()
    .modify('notDeleted')
    .modify('active')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Verify tenant exists
  const tenant = await Tenant.query()
    .modify('notDeleted')
    .modify('active')
    .findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Check if user is member of tenant
  const isMember = await UserTenant.isMember(userId, tenantId)

  if (!isMember) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.USER_NOT_MEMBER_OF_TENANT
    )
  }

  // Get user roles in tenant with permissions
  const userRoles = await UserRole.query()
    .where('user_id', userId)
    .where('tenant_id', tenantId)
    .withGraphFetched('role.permissions')
    .modifyGraph('role', (builder) => {
      builder.modify('notDeleted').modify('active')
    })
    .modifyGraph('role.permissions', (builder) => {
      builder.modify('notDeleted').modify('active')
    })

  // Extract and organize data
  const roles = userRoles
    .filter((ur) => ur.role)
    .map((ur) => {
      // Type guard ensures role exists after filter
      if (!ur.role) return null

      const role = ur.role
      return {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        assignedAt: ur.createdAt,
        permissions: (role.permissions ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          displayName: p.displayName,
          description: null, // Description not included in graph fetch
        })),
      }
    })
    .filter((role): role is NonNullable<typeof role> => role !== null)

  // Get unique permissions across all roles
  const allPermissionsMap = new Map<
    string,
    {
      id: string
      name: string
      displayName: string
      description: string | null
    }
  >()

  for (const role of roles) {
    for (const permission of role.permissions) {
      if (!allPermissionsMap.has(permission.name)) {
        allPermissionsMap.set(permission.name, permission)
      }
    }
  }

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    tenantId: tenant.id,
    tenantName: tenant.name,
    roles,
    permissions: Array.from(allPermissionsMap.values()),
    permissionNames: Array.from(allPermissionsMap.keys()),
  }
}
