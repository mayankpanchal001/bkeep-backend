import type { RequestHandler } from 'express'
import { Request, Response } from 'express'

import { env } from '@config/env'
import logger from '@config/logger'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { SECURITY_RULES } from '@constants/security'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import { findUserById } from '@queries/user.queries'
import {
  acceptUserInvitation,
  createUserInvitation,
  findInvitations,
  resendUserInvitation,
  revokeUserInvitation,
  verifyInvitationToken,
  type CreateUserInvitationData,
} from '@queries/userInvitation.queries'
import { getPaginationMetadata } from '@schema/shared.schema'
import type {
  InvitationIdInput,
  InvitationListInput,
} from '@schema/user.schema'
import {
  queueUserInvitationEmail,
  queueWelcomeEmail,
} from '@services/mailQueue.service'
import { ApiError } from '@utils/ApiError'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all invitations controller
 * Retrieves pending invitations with pagination, sorting, and search
 * All users can only see invitations for their selected tenant
 */
export const getAllInvitations: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user
    if (!user?.selectedTenantId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
      )
    }

    // Get validated query parameters
    const filters = (
      req as AuthenticatedRequest & {
        validatedData: InvitationListInput
      }
    ).validatedData

    // Fetch invitations with filters (filtered by tenant)
    const { invitations, total } = await findInvitations(
      filters,
      user.selectedTenantId
    )

    // Transform invitations to response format (exclude sensitive fields)
    const items = invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.user?.email ?? '',
      userName: invitation.user?.name ?? '',
      tenant: {
        id: invitation.tenant?.id,
        name: invitation.tenant?.name,
      },
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    }))

    // Get pagination metadata
    const pagination = getPaginationMetadata(filters.page, filters.limit, total)

    // Prepare response data
    const responseData = {
      items,
      pagination,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.INVITATIONS_RETRIEVED,
          responseData
        )
      )
  }
)

/**
 * Invite user controller
 * Creates a user invitation for the specified tenant and roles
 * All users can only invite users for their selected tenant
 */
export const inviteUser: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user
    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.USER_NOT_AUTHENTICATED
      )
    }

    if (!user.selectedTenantId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
      )
    }

    // Get validated body data
    const { name, email, roleId } = req.body

    // Create invitation
    const invitationData: CreateUserInvitationData = {
      name,
      email,
      roleId,
      tenantId: user.selectedTenantId,
      invitedBy: user.id,
    }

    const { invitation, plainToken } =
      await createUserInvitation(invitationData)

    // Send invitation email via queue
    try {
      // Fetch inviting user's name
      const invitingUser = await findUserById(user.id)

      const acceptUrl = `${env.FRONTEND_URL}/accept-invitation?token=${plainToken}`
      await queueUserInvitationEmail({
        to: invitation.user?.email ?? email,
        acceptUrl,
        tenantName: invitation.tenant?.name ?? 'the organization',
        expiryDays: Math.floor(
          SECURITY_RULES.USER_INVITATION_TOKEN_EXPIRY_MINUTES / 60 / 24
        ),
        userName: invitation.user?.name ?? name ?? 'User',
        invitedBy: invitingUser.name,
      })
      logger.info(
        `Invitation email queued for ${invitation.user?.email ?? email}`
      )
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to queue invitation email:', error)
    }

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, SUCCESS_MESSAGES.USER_INVITED, {
        id: invitation.id,
        email: invitation.user?.email ?? email,
        tenant: {
          id: invitation.tenant?.id,
          name: invitation.tenant?.name,
        },
        createdAt: invitation.createdAt,
      })
    )
  }
)

/**
 * Verify invitation token
 * Returns whether the invitation requires a password (new user) or not (existing user)
 * This helps the frontend decide whether to show a password field
 */
export const verifyInvitation: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // Get validated query parameters
    const { token } = (
      req as Request & {
        validatedData: { token: string }
      }
    ).validatedData

    // Verify invitation token
    const invitationStatus = await verifyInvitationToken(token)

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.INVITATION_VERIFIED,
          invitationStatus
        )
      )
  }
)

/**
 * Accept invitation
 * Validates token, updates user password, verifies email, and marks invitation as used
 */
export const acceptInvitation: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // Get validated body data
    const { token, password } = req.body as {
      token: string
      password?: string
    }

    // Accept invitation
    const user = await acceptUserInvitation({
      token,
      ...(password !== undefined && { password }),
    })

    try {
      // Get the primary tenant (first tenant or primary tenant)
      const primaryTenant =
        user.tenants?.find((t) => t.userTenants?.isPrimary) ?? user.tenants?.[0]

      const loginUrl = `${env.FRONTEND_URL}/login`

      // Send welcome email via queue
      await queueWelcomeEmail({
        to: user.email,
        userName: user.name,
        tenantName: primaryTenant?.name ?? 'BKeep',
        loginUrl,
      })
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to queue welcome email:', error)
    }

    // Prepare response data (exclude sensitive fields)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.INVITATION_ACCEPTED, {
        user: userData,
      })
    )
  }
)

/**
 * Revoke invitation
 * Soft deletes an invitation by ID
 * All users can only revoke invitations for their selected tenant
 */
export const revokeInvitation: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user
    if (!user?.selectedTenantId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
      )
    }

    // Get validated params
    const { invitationId } = (
      req as AuthenticatedRequest & {
        validatedData: InvitationIdInput
      }
    ).validatedData

    // Revoke invitation (filtered by tenant)
    const revokedInvitation = await revokeUserInvitation(
      invitationId,
      user.selectedTenantId
    )

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.INVITATION_REVOKED, {
        id: revokedInvitation.id,
        email: revokedInvitation.user?.email,
        tenant: {
          id: revokedInvitation.tenant?.id,
          name: revokedInvitation.tenant?.name,
        },
      })
    )
  }
)

/**
 * Resend invitation
 * Generates a new token and resends the invitation email
 * All users can only resend invitations for their selected tenant
 */
export const resendInvitation: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user
    if (!user?.selectedTenantId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
      )
    }

    // Get validated params
    const { invitationId } = (
      req as AuthenticatedRequest & {
        validatedData: InvitationIdInput
      }
    ).validatedData

    // Resend invitation (generates new token, filtered by tenant)
    const { invitation, plainToken } = await resendUserInvitation(
      invitationId,
      user.selectedTenantId
    )

    // Send invitation email via queue
    try {
      // Fetch inviting user's name
      const invitingUser = await findUserById(invitation.invitedBy)

      const acceptUrl = `${env.FRONTEND_URL}/accept-invitation?token=${plainToken}`
      await queueUserInvitationEmail({
        to: invitation.user?.email ?? '',
        acceptUrl,
        tenantName: invitation.tenant?.name ?? 'the organization',
        expiryDays: Math.floor(
          SECURITY_RULES.USER_INVITATION_TOKEN_EXPIRY_MINUTES / 60 / 24
        ),
        userName: invitation.user?.name ?? 'User',
        invitedBy: invitingUser.name,
      })
      logger.info(
        `Invitation email queued for ${invitation.user?.email ?? 'unknown'}`
      )
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to queue invitation email:', error)
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.INVITATION_RESENT, {
        id: invitation.id,
        email: invitation.user?.email,
        tenant: {
          id: invitation.tenant?.id,
          name: invitation.tenant?.name,
        },
        createdAt: invitation.createdAt,
      })
    )
  }
)
