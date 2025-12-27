import bcrypt from 'bcrypt'

import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { ROLES } from '@constants/roles'
import { Role } from '@models/Role'
import { User } from '@models/User'
import { UserAuthenticator } from '@models/UserAuthenticator'
import { UserRole } from '@models/UserRole'
import { UserTenant } from '@models/UserTenant'
import { calculateOffset } from '@schema/shared.schema'
import type { UserListInput } from '@schema/user.schema'
import { ApiError } from '@utils/ApiError'
import { getCurrentISOString } from '@utils/date'

/**
 * User query interface for authentication
 */
export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Find user by email and verify password
 * @param credentials - Login credentials (email and password)
 * @returns User object if credentials are valid
 * @throws ApiError if user not found or password is invalid
 */
export const findUserByEmailAndPassword = async (
  credentials: LoginCredentials
): Promise<User> => {
  const { email, password } = credentials

  // Find user by email (only non-deleted, verified users)
  const user = await User.findByEmail(email)

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD
    )
  }

  // Check if user is verified
  if (!user.isVerified) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Email not verified. Please verify your email first.'
    )
  }

  // Check if user account is active
  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.ACCOUNT_DEACTIVATED
    )
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD
    )
  }

  // Update last logged in timestamp
  await user.$query().patch({
    lastLoggedInAt: getCurrentISOString() as unknown as Date,
  })

  return user
}

/**
 * Find user by ID with relations
 * @param userId - User ID
 * @returns User object with relations (roles with permissions, and tenants)
 * @throws ApiError if user not found
 */
export const findUserById = async (userId: string): Promise<User> => {
  const user = await User.query()
    .modify('notDeleted')
    .findById(userId)
    .withGraphFetched('roles.[permissions]')
    .modifyGraph('roles.permissions', (builder) => {
      builder.modify('notDeleted').modify('active')
    })
    .withGraphFetched('tenants')

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  return user
}

/**
 * Find user by ID with all relations (roles, permissions, and tenants)
 * @param userId - User ID
 * @returns User object with roles, permissions, and tenants
 * @throws ApiError if user not found
 */
export const findUserByIdComplete = async (userId: string): Promise<User> => {
  const user = await User.query()
    .modify('notDeleted')
    .findById(userId)
    .withGraphFetched('[roles.[permissions], tenants]')

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Manually fetch pivot table data using UserTenant model
  if (user.tenants && user.tenants.length > 0) {
    const userTenants = await UserTenant.findByUser(userId)

    // Merge pivot data into tenants
    user.tenants = user.tenants.map((tenant) => {
      const pivot = userTenants.find((ut) => ut.tenantId === tenant.id)
      if (!pivot) {
        return tenant
      }
      return {
        ...tenant,
        userTenants: {
          isPrimary: pivot.isPrimary,
          createdAt: pivot.createdAt,
        },
      }
    })
  }

  return user
}

/**
 * Update user password
 * @param userId - User ID
 * @param passwordHash - Hashed password
 * @returns Updated User object
 * @throws ApiError if user not found
 */
export const updateUserPassword = async (
  userId: string,
  passwordHash: string
): Promise<User> => {
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  await user.$query().patch({
    passwordHash,
  })

  return user
}

/**
 * Interface for updating user profile
 */
export interface UpdateUserProfileData {
  name: string
}

/**
 * Update user profile
 * @param userId - User ID
 * @param data - Profile data to update (name only)
 * @returns Updated User object
 * @throws ApiError if user not found
 */
export const updateUserProfile = async (
  userId: string,
  data: UpdateUserProfileData
): Promise<User> => {
  const { name } = data

  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Update only name
  await user.$query().patch({ name })

  return user
}

/**
 * Interface for user query result with pagination
 */
export interface UserQueryResult {
  users: User[]
  total: number
}

/**
 * Map sort field to database column
 */
const mapUserSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    name: 'name',
    email: 'email',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    lastLoggedInAt: 'last_logged_in_at',
  }

  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'created_at'
}

/**
 * Find users with pagination, sorting, search, and filtering
 * @param filters - Filter, pagination, and sorting parameters
 * @param tenantId - Optional tenant ID to filter users by tenant (for Admin users)
 * @param requestingUserRole - Optional role of the requesting user (to filter superadmin users)
 * @returns Object containing users array and total count
 */
export const findUsers = async (
  filters: UserListInput,
  tenantId?: string,
  requestingUserRole?: string,
  requestingUserId?: string
): Promise<UserQueryResult> => {
  const {
    page,
    limit,
    sort = 'createdAt',
    order = 'asc',
    search,
    isVerified,
    isActive,
  } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapUserSortField(sort)

  // Build base query
  let query = User.query().modify('notDeleted')

  // Filter out the requesting user from results
  if (requestingUserId) {
    query = query.whereNot('users.id', requestingUserId)
  }

  // Apply tenant filter if provided (for Admin users)
  if (tenantId) {
    query = query
      .join('user_tenants', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
      .groupBy('users.id')
  }

  // Exclude superadmin users if requesting user is not a superadmin
  if (requestingUserRole !== ROLES.SUPERADMIN) {
    query = query.whereNotExists((builder) => {
      builder
        .select(1)
        .from('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .whereRaw('user_roles.user_id = users.id')
        .where('roles.name', ROLES.SUPERADMIN)
        .whereNull('roles.deleted_at')
    })
  }

  // Apply verified filter if provided
  if (isVerified !== undefined) {
    if (isVerified) {
      query = query.modify('verified')
    } else {
      query = query.modify('unverified')
    }
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

  // Apply pagination and sorting, then fetch relations
  const users = await query
    .orderBy(sortColumn, order)
    .limit(limit)
    .offset(offset)
    .withGraphFetched('roles.[permissions]')
    .modifyGraph('roles.permissions', (builder) => {
      builder.modify('notDeleted').modify('active')
    })
    .withGraphFetched('tenants')

  if (users.length > 0) {
    const userIds = users.map((user) => user.id)
    // Fetch all user-tenant relationships for these users using UserTenant model
    const userTenants = await UserTenant.query().whereIn('user_id', userIds)

    const pivotMap = new Map(
      userTenants.map((ut) => [
        `${ut.userId}-${ut.tenantId}`,
        {
          isPrimary: ut.isPrimary,
          createdAt: ut.createdAt,
        },
      ])
    )

    // Merge pivot data into tenants for each user
    users.forEach((user) => {
      if (user.tenants && user.tenants.length > 0) {
        user.tenants = user.tenants.map((tenant) => {
          const pivot = pivotMap.get(`${user.id}-${tenant.id}`)
          return pivot ? { ...tenant, userTenants: pivot } : tenant
        })
      }
    })
  }

  return { users, total }
}

/**
 * Interface for user statistics
 */
export interface UserStatistics {
  total: number
  verified: number
  unverified: number
  withRoles: number
  withoutRoles: number
  recentUsers: Array<{
    id: string
    email: string
    name: string
    isVerified: boolean
    createdAt: Date
  }>
}

/**
 * Get user statistics and overview data
 * @param tenantId - Optional tenant ID to filter users by tenant
 * @returns User statistics including counts and recent users
 */
export const getUserStatistics = async (
  tenantId?: string
): Promise<UserStatistics> => {
  // Base query for non-deleted users
  let baseQuery = User.query().modify('notDeleted')

  // Filter out superadmin users
  baseQuery = baseQuery.whereNotExists((builder) => {
    builder
      .select(1)
      .from('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .whereRaw('user_roles.user_id = users.id')
      .where('roles.name', ROLES.SUPERADMIN)
      .whereNull('roles.deleted_at')
  })

  // Filter by tenant if tenantId is provided
  if (tenantId) {
    baseQuery = baseQuery
      .join('user_tenants', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
      .groupBy('users.id')
  }

  // Get total count
  const total = await baseQuery.clone().resultSize()

  // Get verified users count
  const verified = await baseQuery.clone().modify('verified').resultSize()

  // Get unverified users count
  const unverified = await baseQuery.clone().modify('unverified').resultSize()

  // Get users with roles count
  // Using joinRelated to count users that have at least one role
  let usersWithRolesQuery = User.query()
    .where('users.deleted_at', null)
    .join('user_roles', 'users.id', 'user_roles.user_id')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('roles.deleted_at', null)
    .whereNotExists((builder) => {
      builder
        .select(1)
        .from('user_roles as ur2')
        .join('roles as r2', 'ur2.role_id', 'r2.id')
        .whereRaw('ur2.user_id = users.id')
        .where('r2.name', ROLES.SUPERADMIN)
        .whereNull('r2.deleted_at')
    })

  // Filter by tenant if tenantId is provided
  if (tenantId) {
    usersWithRolesQuery = usersWithRolesQuery
      .join('user_tenants', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
      .where('user_roles.tenant_id', tenantId)
  }

  const usersWithRolesResult = await usersWithRolesQuery
    .countDistinct('users.id as count')
    .first()

  const usersWithRoles = Number.parseInt(
    String(
      (usersWithRolesResult as unknown as { count?: string | number })?.count ??
        '0'
    ),
    10
  )

  // Get users without roles count
  const withoutRoles = total - usersWithRoles

  // Get recent users (last 5 created)
  let recentUsersQuery = User.query()
    .modify('notDeleted')
    .whereNotExists((builder) => {
      builder
        .select(1)
        .from('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .whereRaw('user_roles.user_id = users.id')
        .where('roles.name', ROLES.SUPERADMIN)
        .whereNull('roles.deleted_at')
    })
    .orderBy('users.created_at', 'desc')
    .limit(5)

  // Filter by tenant if tenantId is provided
  if (tenantId) {
    recentUsersQuery = recentUsersQuery
      .join('user_tenants', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
      .groupBy(
        'users.id',
        'users.email',
        'users.name',
        'users.is_verified',
        'users.created_at'
      )
  }

  const recentUsersData = await recentUsersQuery.select(
    'users.id',
    'users.email',
    'users.name',
    'users.is_verified as isVerified',
    'users.created_at as createdAt'
  )

  const recentUsers = recentUsersData.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    isVerified: (user as { isVerified: boolean }).isVerified,
    createdAt: (user as { createdAt: Date }).createdAt,
  }))

  return {
    total,
    verified,
    unverified,
    withRoles: usersWithRoles,
    withoutRoles,
    recentUsers,
  }
}

/**
 * Delete user (soft delete)
 * Marks a user as deleted by setting deleted_at timestamp
 * @param userId - User ID
 * @returns Deleted User object
 * @throws ApiError if user not found, already deleted, or is superadmin
 */
export const deleteUser = async (userId: string): Promise<User> => {
  const user = await User.query()
    .modify('notDeleted')
    .findById(userId)
    .withGraphFetched('roles')

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Check if user has superadmin role
  const hasSuperAdminRole = user.roles?.some(
    (role) => role.name === ROLES.SUPERADMIN
  )

  if (hasSuperAdminRole) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.CANNOT_DELETE_SUPERADMIN
    )
  }

  // Soft delete the user
  await user.softDelete()

  return user
}

/**
 * Update user activation status
 * @param userId - User ID
 * @param isActive - Activation status (true = active, false = inactive)
 * @returns Updated User object
 * @throws ApiError if user not found or is superadmin trying to deactivate
 */
export const updateUserActivationStatus = async (
  userId: string,
  isActive: boolean
): Promise<User> => {
  const user = await User.query()
    .modify('notDeleted')
    .findById(userId)
    .withGraphFetched('roles')

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Check if trying to deactivate a superadmin user
  if (!isActive) {
    const hasSuperAdminRole = user.roles?.some(
      (role) => role.name === ROLES.SUPERADMIN
    )

    if (hasSuperAdminRole) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.CANNOT_DEACTIVATE_SUPERADMIN
      )
    }
  }

  await user.$query().patch({ isActive })

  return user
}

/**
 * Update user MFA status
 * @param userId - User ID
 * @param mfaEnabled - MFA enabled status
 * @returns Updated User object
 * @throws ApiError if user not found
 */
export const updateUserMfaStatus = async (
  userId: string,
  mfaEnabled: boolean
): Promise<User> => {
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  await user.$query().patch({ mfaEnabled })

  return user
}

/**
 * Setup TOTP for user (create authenticator)
 * @param userId - User ID
 * @param secret - TOTP secret
 * @param backupCodes - JSON encoded backup codes
 * @param userAgent - User agent string
 * @param ipAddress - IP address
 * @returns Created UserAuthenticator object
 * @throws ApiError if user not found
 */
export const setupUserTotp = async (
  userId: string,
  secret: string,
  backupCodes: string,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<UserAuthenticator> => {
  // Verify user exists
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Deactivate any existing authenticators for this user
  await UserAuthenticator.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .patch({
      isActive: false,
    })

  // Create new authenticator (unverified)
  const authenticator = await UserAuthenticator.query().insert({
    userId,
    type: 'totp',
    secret,
    backupCodes,
    isActive: false, // Not active until verified
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
  })

  return authenticator
}

/**
 * Verify and enable TOTP for user
 * @param userId - User ID
 * @param authenticatorId - Optional authenticator ID (if not provided, uses the latest unverified one)
 * @returns Verified UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
export const verifyAndEnableUserTotp = async (
  userId: string,
  authenticatorId?: string
): Promise<UserAuthenticator> => {
  // Verify user exists
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Find the authenticator
  let authenticator: UserAuthenticator | undefined

  if (authenticatorId) {
    authenticator = await UserAuthenticator.query()
      .modify('notDeleted')
      .modify('byUser', userId)
      .findById(authenticatorId)
  } else {
    // Find the most recent unverified authenticator
    authenticator = await UserAuthenticator.query()
      .modify('notDeleted')
      .modify('byUser', userId)
      .modify('unverified')
      .orderBy('created_at', 'desc')
      .first()
  }

  if (!authenticator) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.MFA_TOTP_SETUP_REQUIRED
    )
  }

  // Activate and verify the authenticator
  await authenticator.$query().patch({
    isActive: true,
    verifiedAt: getCurrentISOString() as unknown as Date,
  })

  // Enable MFA on user account
  await user.$query().patch({
    mfaEnabled: true,
  })

  return authenticator
}

/**
 * Disable TOTP for user
 * @param userId - User ID
 * @returns Updated User object
 * @throws ApiError if user not found
 */
export const disableUserTotp = async (userId: string): Promise<User> => {
  // Verify user exists
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Soft delete all authenticators for this user
  await UserAuthenticator.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .patch({
      deletedAt: getCurrentISOString() as unknown as Date,
    })

  // Disable MFA on user account
  await user.$query().patch({
    mfaEnabled: false,
  })

  return user
}

/**
 * Update user backup codes
 * @param userId - User ID
 * @param backupCodes - JSON encoded backup codes
 * @returns Updated UserAuthenticator object
 * @throws ApiError if user not found or authenticator not found
 */
export const updateUserBackupCodes = async (
  userId: string,
  backupCodes: string
): Promise<UserAuthenticator> => {
  // Verify user exists
  const user = await User.query().modify('notDeleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Find active authenticator
  const authenticator = await UserAuthenticator.findActiveByUserAndType(
    userId,
    'totp'
  )

  if (!authenticator) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.MFA_TOTP_NOT_ENABLED
    )
  }

  // Update backup codes
  await authenticator.$query().patch({
    backupCodes,
  })

  return authenticator
}

/**
 * Get active TOTP authenticator for user
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
export const getUserTotpAuthenticator = async (
  userId: string
): Promise<UserAuthenticator | undefined> => {
  return UserAuthenticator.findActiveByUserAndType(userId, 'totp')
}

/**
 * Get unverified TOTP authenticator for user
 * Used during TOTP verification process
 * @param userId - User ID
 * @returns UserAuthenticator or undefined
 */
export const getUnverifiedTotpAuthenticator = async (
  userId: string
): Promise<UserAuthenticator | undefined> => {
  return UserAuthenticator.query()
    .modify('notDeleted')
    .modify('byUser', userId)
    .modify('byType', 'totp')
    .modify('unverified')
    .orderBy('created_at', 'desc')
    .first()
}

/**
 * Update authenticator last used timestamp
 * @param authenticatorId - Authenticator ID
 */
export const updateAuthenticatorLastUsed = async (
  authenticatorId: string
): Promise<void> => {
  await UserAuthenticator.query()
    .findById(authenticatorId)
    .patch({
      lastUsedAt: getCurrentISOString() as unknown as Date,
    })
}

/**
 * Restore user (un-delete)
 * Restores a soft-deleted user by clearing the deleted_at timestamp
 * @param userId - User ID
 * @returns Restored User object
 * @throws ApiError if user not found or not deleted
 */
export const restoreUser = async (userId: string): Promise<User> => {
  const user = await User.query().modify('deleted').findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  await user.restore()

  return user
}

/**
 * Update user roles
 * Replaces all roles for a user with the provided role IDs
 * @param userId - User ID
 * @param roleIds - Array of role IDs to assign to the user
 * @returns Updated User object with roles
 * @throws ApiError if user not found, role IDs are invalid, or superadmin role is included
 */
export const updateUserRoles = async (
  userId: string,
  roleIds: string[]
): Promise<User> => {
  // Find user with tenants to get primary tenant
  const user = await User.query()
    .modify('notDeleted')
    .findById(userId)
    .withGraphFetched('tenants')

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Get primary tenant
  const tenants = user.tenants ?? []
  const primaryTenant =
    tenants.find((t) => t.userTenants?.isPrimary === true) ?? tenants[0]

  if (!primaryTenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NO_TENANT)
  }

  // Validate all role IDs exist, are active, and not deleted
  if (roleIds.length > 0) {
    const roles = await Role.query()
      .modify('notDeleted')
      .modify('active')
      .whereIn('id', roleIds)

    if (roles.length !== roleIds.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'One or more role IDs are invalid, inactive, or deleted'
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

  // Sync user roles in tenant (atomic operation using UserRole model)
  await UserRole.syncUserRolesInTenant(userId, primaryTenant.id, roleIds)

  // Return updated user with roles
  return findUserById(userId)
}
