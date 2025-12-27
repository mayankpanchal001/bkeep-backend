import { createHash, randomBytes } from 'node:crypto'

import bcrypt from 'bcrypt'
import type { Knex } from 'knex'

import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { ROLES } from '@constants/roles'
import db from '@database/connection'
import { Role } from '@models/Role'
import { Tenant } from '@models/Tenant'
import { User } from '@models/User'
import { UserInvitation } from '@models/UserInvitation'
import { UserRole } from '@models/UserRole'
import { UserTenant } from '@models/UserTenant'
import { calculateOffset } from '@schema/shared.schema'
import type { InvitationListInput } from '@schema/user.schema'
import { ApiError } from '@utils/ApiError'
import { getCurrentISOString } from '@utils/date'

/**
 * Interface for creating a user invitation
 */
export interface CreateUserInvitationData {
  name: string
  email: string
  roleId: string
  tenantId: string
  invitedBy: string
}

/**
 * Interface for user invitation result
 */
export interface UserInvitationResult {
  invitation: UserInvitation
  plainToken: string // Plain token to be sent via email (not stored in DB)
}

/**
 * Create user invitation
 * Creates or finds user, generates invitation token, and associates user with tenant and role
 * @param data - Invitation data (name, email, roleId, tenantId, invitedBy)
 * @returns UserInvitationResult with invitation and plain token
 * @throws ApiError if tenant not found, role ID is invalid, or invitation already exists
 */
export const createUserInvitation = async (
  data: CreateUserInvitationData
): Promise<UserInvitationResult> => {
  const { name, email, roleId, tenantId, invitedBy } = data

  // Verify the inviting user exists and is not deleted
  const invitingUser = await User.query()
    .modify('notDeleted')
    .findById(invitedBy)

  if (!invitingUser) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Verify tenant exists and is active
  const tenant = await Tenant.query().modify('notDeleted').findById(tenantId)

  if (!tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Validate role ID exists, is active, and not deleted
  const role = await Role.query()
    .modify('notDeleted')
    .modify('active')
    .findById(roleId)

  if (!role) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.ROLE_ID_INVALID)
  }

  // Check if role is superadmin
  if (role.name === ROLES.SUPERADMIN) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.CANNOT_ASSIGN_SUPERADMIN_ROLE
    )
  }

  // Find or create user
  let user = await User.findByEmail(email)

  if (!user) {
    // Create user without password (user will set password when accepting invitation)
    // Generate a temporary password hash (user must reset password)
    const tempPasswordHash = randomBytes(32).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPasswordHash, 10)

    user = await User.query().insert({
      email: email.toLowerCase(),
      name: name.trim(),
      passwordHash: hashedPassword,
      isVerified: false,
      isActive: true,
      mfaEnabled: true,
    })
  } else {
    // Check if user is already associated with this tenant
    const isMember = await UserTenant.isMember(user.id, tenantId)

    if (isMember) {
      // Check if there's an active invitation
      const existingInvitation = await UserInvitation.findByUserAndTenant(
        user.id,
        tenantId
      )

      if (existingInvitation) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          ERROR_MESSAGES.INVITATION_ALREADY_EXISTS
        )
      }
    }
  }

  // Check if invitation already exists for this user and tenant
  const existingInvitation = await UserInvitation.findByUserAndTenant(
    user.id,
    tenantId
  )

  if (existingInvitation) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_MESSAGES.INVITATION_ALREADY_EXISTS
    )
  }

  // Generate secure invitation token
  const plainToken = randomBytes(32).toString('hex')

  // Hash the token using SHA-256 before storing
  const hashedToken = createHash('sha256').update(plainToken).digest('hex')

  // Ensure user is defined (should never be undefined at this point)
  if (!user) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    )
  }

  // Store user ID for use in transaction (TypeScript narrowing)
  const userId = user.id

  // Use transaction to ensure atomicity
  const invitation = await db.transaction(async (trx: Knex.Transaction) => {
    // Create invitation with hashed token and roleId
    const insertedInvitation = await UserInvitation.query(trx).insert({
      userId: userId,
      tenantId: tenantId,
      invitedBy: data.invitedBy,
      roleId: roleId, // Store roleId to assign when invitation is accepted
      token: hashedToken, // Store hashed token in database
    })

    // NOTE: Do NOT add user to UserTenant or UserRole until invitation is accepted
    // This allows for proper re-invitation if user doesn't accept
    // UserTenant and UserRole will be added in acceptUserInvitation

    // Fetch and return the invitation with relations
    const fetchedInvitation = await UserInvitation.query(trx)
      .findById(insertedInvitation.id)
      .withGraphFetched('[user, tenant]')

    if (!fetchedInvitation) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      )
    }

    return fetchedInvitation
  })

  return {
    invitation,
    plainToken, // Return plain token for email (not stored in DB)
  }
}

/**
 * Interface for accepting a user invitation
 */
export interface AcceptInvitationData {
  token: string
  password?: string
}

/**
 * Verify invitation token
 * Validates token and returns invitation details including whether user is new or existing
 * @param token - Invitation token
 * @returns Invitation details with user status
 * @throws ApiError if token is invalid or invitation not found
 */
export const verifyInvitationToken = async (token: string) => {
  // Hash the provided token to compare with stored hash
  const hashedToken = createHash('sha256').update(token).digest('hex')

  // Find invitation by hashed token (only valid, non-deleted invitations)
  const invitation = await UserInvitation.query()
    .modify('notDeleted')
    .where('token', hashedToken)
    .withGraphFetched('[user, tenant]')
    .first()

  if (!invitation) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_INVITATION_TOKEN
    )
  }

  if (!invitation.user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  if (!invitation.tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Fetch full user details to check verification status
  const fullUser = await User.query().findById(invitation.user.id)

  if (!fullUser) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Determine if user is new (needs password) or existing (no password needed)
  const isNewUser = !fullUser.isVerified

  return {
    requiresPassword: isNewUser,
    email: invitation.user.email,
    name: invitation.user.name,
    tenantName: invitation.tenant.name,
  }
}

/**
 * Accept user invitation
 * For NEW users (not verified): Requires password, marks as verified
 * For EXISTING users (already verified): No password needed, just adds to tenant
 * @param data - Invitation acceptance data (token, password optional for existing users)
 * @returns User with tenant and role information
 * @throws ApiError if token is invalid, invitation not found, or user not found
 */
export const acceptUserInvitation = async (
  data: AcceptInvitationData
): Promise<User> => {
  const { token, password } = data

  // Hash the provided token to compare with stored hash
  const hashedToken = createHash('sha256').update(token).digest('hex')

  // Find invitation by hashed token (only valid, non-deleted invitations)
  const invitation = await UserInvitation.query()
    .modify('notDeleted')
    .where('token', hashedToken)
    .withGraphFetched('[user, tenant]')
    .first()

  if (!invitation) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_INVITATION_TOKEN
    )
  }

  if (!invitation.user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  const userId = invitation.user.id
  const tenantId = invitation.tenantId
  const roleId = invitation.roleId

  // Use transaction to ensure atomicity
  const user = await db.transaction(async (trx: Knex.Transaction) => {
    // Get user details
    const user = await User.query(trx).findById(userId)
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
    }

    const isNewUser = !user.isVerified

    // For NEW users: Password is REQUIRED
    if (isNewUser && !password) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVITATION_PASSWORD_REQUIRED_NEW_USER
      )
    }

    // For EXISTING users: Password should NOT be provided
    if (!isNewUser && password) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVITATION_PASSWORD_NOT_ALLOWED_EXISTING_USER
      )
    }

    // Update user based on whether they're new or existing
    if (isNewUser) {
      // NEW USER: Set password and mark as verified
      const passwordHash = await bcrypt.hash(password as string, 10)
      await user.$query(trx).patch({
        passwordHash: passwordHash,
        isVerified: true,
        verifiedAt: getCurrentISOString() as unknown as Date,
      })
    }
    // EXISTING USER: No password update needed

    // Check if user is already a member of this tenant
    const isMember = await UserTenant.isMember(userId, tenantId)

    if (!isMember) {
      // Determine if this should be primary tenant
      const existingTenants = await UserTenant.findByUser(userId)
      const isPrimary = existingTenants.length === 0

      // If making this primary, unset other primary flags
      if (isPrimary) {
        await UserTenant.query(trx)
          .where('user_id', userId)
          .patch({ isPrimary: false })
      }

      // Add user to tenant
      await UserTenant.query(trx).insert({
        userId,
        tenantId,
        isPrimary,
      })
    }

    // Assign role to user for this tenant using the roleId from invitation
    await UserRole.syncUserRolesInTenant(userId, tenantId, [roleId])

    // Soft delete the invitation
    await invitation
      .$query(trx)
      .patch({ deletedAt: getCurrentISOString() as unknown as Date })

    // Fetch and return the updated user with relations
    const updatedUser = await User.query(trx)
      .withGraphFetched('[roles, tenants]')
      .findById(userId)

    if (!updatedUser) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      )
    }

    return updatedUser
  })

  return user
}

/**
 * Revoke user invitation
 * Soft deletes an invitation by ID
 * Since UserTenant and UserRole are only added on acceptance, we don't need to remove them here
 * @param invitationId - Invitation ID to revoke
 * @param tenantId - Optional tenant ID to verify access (for Admin users)
 * @returns The revoked invitation
 * @throws ApiError if invitation not found or already revoked
 */
export const revokeUserInvitation = async (
  invitationId: string,
  tenantId?: string
): Promise<UserInvitation> => {
  // Find invitation by ID (including deleted ones to check if already revoked)
  const invitation = await UserInvitation.query()
    .findById(invitationId)
    .withGraphFetched('[user, tenant]')

  if (!invitation) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      ERROR_MESSAGES.INVITATION_NOT_FOUND
    )
  }

  // Check if already revoked
  if (invitation.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.INVITATION_ALREADY_REVOKED
    )
  }

  // If tenantId is provided, verify the invitation belongs to that tenant
  if (tenantId && invitation.tenantId !== tenantId) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.UNAUTHORIZED_ACCESS
    )
  }

  if (!invitation.user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // Use transaction to ensure atomicity
  const revokedInvitation = await db.transaction(
    async (trx: Knex.Transaction) => {
      // Soft delete the invitation
      await invitation.$query(trx).patch({
        deletedAt: getCurrentISOString() as unknown as Date,
      })

      // NOTE: No need to remove from UserTenant or UserRole since they're only added on acceptance
      // This is the correct behavior - revoke simply cancels the invitation

      // Fetch and return the revoked invitation
      const fetchedInvitation = await UserInvitation.query(trx)
        .findById(invitationId)
        .withGraphFetched('[user, tenant]')
        .first()

      if (!fetchedInvitation) {
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        )
      }

      return fetchedInvitation
    }
  )

  // Convert deletedAt to string if it's a Date object
  // This ensures JSON schema validation passes (expects string or null)
  if (revokedInvitation.deletedAt instanceof Date) {
    Object.assign(revokedInvitation, {
      deletedAt: revokedInvitation.deletedAt.toISOString(),
    })
  }

  return revokedInvitation
}

/**
 * Resend user invitation
 * Generates a new token for an existing invitation and updates it
 * @param invitationId - Invitation ID to resend
 * @param tenantId - Optional tenant ID to verify access (for Admin users)
 * @returns UserInvitationResult with invitation and plain token
 * @throws ApiError if invitation not found, already revoked, or unauthorized access
 */
export const resendUserInvitation = async (
  invitationId: string,
  tenantId?: string
): Promise<UserInvitationResult> => {
  // Find invitation by ID (only non-deleted invitations)
  const invitation = await UserInvitation.query()
    .modify('notDeleted')
    .findById(invitationId)
    .withGraphFetched('[user, tenant]')

  if (!invitation) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      ERROR_MESSAGES.INVITATION_NOT_FOUND
    )
  }

  // If tenantId is provided, verify the invitation belongs to that tenant
  if (tenantId && invitation.tenantId !== tenantId) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.UNAUTHORIZED_ACCESS
    )
  }

  if (!invitation.user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  if (!invitation.tenant) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TENANT_NOT_FOUND)
  }

  // Generate new secure invitation token
  const plainToken = randomBytes(32).toString('hex')

  // Hash the token using SHA-256 before storing
  const hashedToken = createHash('sha256').update(plainToken).digest('hex')

  // Use transaction to ensure atomicity
  const updatedInvitation = await db.transaction(
    async (trx: Knex.Transaction) => {
      // Update invitation with new hashed token
      await invitation.$query(trx).patch({
        token: hashedToken,
      })

      // Fetch and return the updated invitation with relations
      const fetchedInvitation = await UserInvitation.query(trx)
        .findById(invitationId)
        .withGraphFetched('[user, tenant]')
        .first()

      if (!fetchedInvitation) {
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        )
      }

      return fetchedInvitation
    }
  )

  return {
    invitation: updatedInvitation,
    plainToken, // Return plain token for email (not stored in DB)
  }
}

/**
 * Interface for invitation query result with pagination
 */
export interface InvitationQueryResult {
  invitations: UserInvitation[]
  total: number
}

/**
 * Map sort field to database column
 */
const mapInvitationSortField = (field: string): string => {
  const fieldMap: Record<string, string> = {
    email: 'users.email',
    createdAt: 'user_invitations.created_at',
    updatedAt: 'user_invitations.updated_at',
  }

  // eslint-disable-next-line security/detect-object-injection
  return fieldMap[field] ?? 'user_invitations.created_at'
}

/**
 * Find invitations with pagination, sorting, and search
 * @param filters - Filter, pagination, and sorting parameters
 * @param tenantId - Optional tenant ID to filter invitations by tenant (for Admin users)
 * @returns Object containing invitations array and total count
 */
export const findInvitations = async (
  filters: InvitationListInput,
  tenantId?: string
): Promise<InvitationQueryResult> => {
  const { page, limit, sort = 'createdAt', order = 'asc', search } = filters

  const offset = calculateOffset(page, limit)
  const sortColumn = mapInvitationSortField(sort)

  // Build base query - only non-deleted invitations
  // Always join users table for email sorting and search
  let query = UserInvitation.query()
    .whereNull('user_invitations.deleted_at')
    .join('users', 'user_invitations.user_id', 'users.id')
    .whereNull('users.deleted_at')

  // Apply tenant filter (required - all users see only their selected tenant)
  if (tenantId) {
    query = query.where('user_invitations.tenant_id', tenantId)
  }

  // Apply search if provided (search by user email or name)
  if (search) {
    query = query.where((builder) => {
      builder
        .whereILike('users.email', `%${search}%`)
        .orWhereILike('users.name', `%${search}%`)
    })
  }

  // Group by invitation ID to avoid duplicates when joining
  query = query.groupBy('user_invitations.id')

  // Get total count before pagination
  const total = await query.resultSize()

  // Apply pagination and sorting, then fetch relations
  const invitations = await query
    .orderByRaw(`${sortColumn} ${order}`)
    .limit(limit)
    .offset(offset)
    .withGraphFetched('[user, tenant]')

  return {
    invitations,
    total,
  }
}
