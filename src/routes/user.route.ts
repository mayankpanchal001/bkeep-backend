import { Router, type Router as RouterType } from 'express'

import { ROLES } from '@constants/roles'
import { updateProfile } from '@controllers/auth.controller'
import {
  deleteUserById,
  getAllUsers,
  getUserById,
  getUserStatistics,
  restoreUserById,
  updateUserActivation,
  updateUserRolesController,
} from '@controllers/user.controller'
import {
  getAllInvitations,
  inviteUser,
  resendInvitation,
  revokeInvitation,
} from '@controllers/userInvitation.controller'
import { authenticate, authorize } from '@middlewares/auth.middleware'
import { validate } from '@middlewares/validate.middleware'
import { updateProfileSchema } from '@schema/auth.schema'
import {
  invitationIdSchema,
  invitationListSchema,
  updateUserActivationSchema,
  updateUserRolesSchema,
  userIdSchema,
  userInvitationSchema,
  userListSchema,
} from '@schema/user.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve all users
 *     description: Retrieves all users with their tenant, roles and permissions. Includes pagination, sorting, search, and filtering.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, email, createdAt, updatedAt, lastLoggedInAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Search term to filter users by name or email
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status (true/false)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by activation status (true/false)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Users retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserWithRelations'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(userListSchema, 'query'),
  getAllUsers
)

/**
 * @swagger
 * /users/statistics:
 *   get:
 *     summary: Retrieve user statistics and overview data
 *     description: Returns aggregated statistics about users including counts and recent users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User statistics retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/UserStatistics'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/statistics',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  getUserStatistics
)

/**
 * @swagger
 * /users/invitations:
 *   get:
 *     summary: List pending user invitations
 *     description: Retrieves pending invitations with pagination, sorting, and search. All users can only see invitations for their selected tenant.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [email, createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by user email or name
 *     responses:
 *       200:
 *         description: Invitations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Invitations retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           email:
 *                             type: string
 *                             format: email
 *                           userName:
 *                             type: string
 *                           tenant:
 *                             $ref: '#/components/schemas/Tenant'
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/invitations',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(invitationListSchema, 'query'),
  getAllInvitations
)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Retrieve a specific user by ID
 *     description: Retrieves a specific user by their ID with their tenant, roles and permissions.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/UserWithRelations'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate, validate(userIdSchema, 'params'), getUserById)

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update current user profile
 *     description: Updates the current authenticated user's profile name (only name can be updated).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: 'John Doe'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User profile updated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/UserWithRelations'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  updateProfile
)

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Soft deletes a user by their ID. The user is marked as deleted but not permanently removed from the database.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User deleted successfully'
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/:id',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(userIdSchema, 'params'),
  deleteUserById
)

/**
 * @swagger
 * /users/{id}/activation:
 *   patch:
 *     summary: Activate or deactivate a user account
 *     description: Updates the activation status of a user account.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: true to activate, false to deactivate
 *                 example: true
 *     responses:
 *       200:
 *         description: User activation status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User account activated successfully'
 *                 data:
 *                   allOf:
 *                     - type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: '123e4567-e89b-12d3-a456-426614174000'
 *                         email:
 *                           type: string
 *                           example: 'user@example.com'
 *                         name:
 *                           type: string
 *                           example: 'John Doe'
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/activation',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(userIdSchema, 'params'),
  validate(updateUserActivationSchema),
  updateUserActivation
)

/**
 * @swagger
 * /users/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted user
 *     description: Restores a soft-deleted user by clearing the deleted_at timestamp.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *     responses:
 *       200:
 *         description: User restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User restored successfully'
 *                 data:
 *                   allOf:
 *                     - type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: '123e4567-e89b-12d3-a456-426614174000'
 *                         email:
 *                           type: string
 *                           example: 'user@example.com'
 *                         name:
 *                           type: string
 *                           example: 'John Doe'
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         deletedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           example: null
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found or not deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/restore',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(userIdSchema, 'params'),
  restoreUserById
)

/**
 * @swagger
 * /users/{id}/roles:
 *   put:
 *     summary: Update roles assigned to a user
 *     description: Updates roles assigned to a user. Replaces existing roles with the provided role IDs.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleIds
 *             properties:
 *               roleIds:
 *                 type: array
 *                 description: Array of role IDs to assign to the user (replaces all existing roles)
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example:
 *                   - '123e4567-e89b-12d3-a456-426614174000'
 *                   - '123e4567-e89b-12d3-a456-426614174001'
 *     responses:
 *       200:
 *         description: User roles updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User roles updated successfully'
 *                 data:
 *                   allOf:
 *                     - type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: '123e4567-e89b-12d3-a456-426614174000'
 *                         email:
 *                           type: string
 *                           example: 'user@example.com'
 *                         name:
 *                           type: string
 *                           example: 'John Doe'
 *                     - type: object
 *                       properties:
 *                         roles:
 *                           type: array
 *                           description: List of roles assigned to the user
 *                           items:
 *                             $ref: '#/components/schemas/Role'
 *                         permissions:
 *                           type: array
 *                           description: List of permissions assigned to the user (aggregated from all roles)
 *                           items:
 *                             $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Validation error or invalid role IDs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized or cannot assign SuperAdmin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found or user has no tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  '/:id/roles',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(userIdSchema, 'params'),
  validate(updateUserRolesSchema),
  updateUserRolesController
)

/**
 * @swagger
 * /users/invitation:
 *   post:
 *     summary: Invite a user to join a tenant
 *     description: Creates a user invitation for the specified tenant and roles. All users can only invite users for their selected tenant.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - roleId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: User's full name
 *                 example: 'John Doe'
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: 'newuser@example.com'
 *               roleId:
 *                 type: string
 *                 format: uuid
 *                 description: Role ID to assign to the user
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       201:
 *         description: User invitation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User invitation sent successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: '123e4567-e89b-12d3-a456-426614174002'
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: 'newuser@example.com'
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 *                     token:
 *                       type: string
 *                       description: Invitation token (should not be returned in production)
 *                       example: 'abc123def456...'
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-01-15T10:30:00.000Z'
 *       400:
 *         description: Validation error or invalid role/tenant IDs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized or trying to assign SuperAdmin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Invitation already exists for this user and tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/invitation',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(userInvitationSchema),
  inviteUser
)

/**
 * @swagger
 * /users/invitations/{invitationId}:
 *   delete:
 *     summary: Revoke a user invitation
 *     description: Soft deletes an invitation by ID. All users can only revoke invitations for their selected tenant.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invitation ID to revoke
 *     responses:
 *       200:
 *         description: Invitation revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Invitation revoked successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: '123e4567-e89b-12d3-a456-426614174002'
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: 'user@example.com'
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-01-15T10:30:00.000Z'
 *       400:
 *         description: Invitation has already been revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'Invitation has already been revoked'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized or trying to revoke invitation from different tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Invitation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/invitations/:invitationId',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(invitationIdSchema, 'params'),
  revokeInvitation
)

/**
 * @swagger
 * /users/invitations/{invitationId}/resend:
 *   post:
 *     summary: Resend a user invitation email
 *     description: Generates a new token for an existing invitation and resends the invitation email. All users can only resend invitations for their selected tenant.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invitation ID to resend
 *     responses:
 *       200:
 *         description: Invitation email resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Invitation email resent successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: '123e4567-e89b-12d3-a456-426614174002'
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: 'user@example.com'
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-01-15T10:30:00.000Z'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized or trying to resend invitation from different tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Invitation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/invitations/:invitationId/resend',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(invitationIdSchema, 'params'),
  resendInvitation
)

export default router
