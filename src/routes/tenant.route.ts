import { Router, type Router as RouterType } from 'express'

import { ROLES } from '@constants/roles'
import {
  createTenantController,
  deleteTenantById,
  getAllTenants,
  getTenantById,
  getUserTenants,
  restoreTenantById,
  switchTenant,
  updateTenantController,
} from '@controllers/tenant.controller'
import { authenticate, authorize } from '@middlewares/auth.middleware'
import { validate } from '@middlewares/validate.middleware'
import {
  createTenantSchema,
  tenantIdSchema,
  tenantListSchema,
  updateTenantSchema,
} from '@schema/tenant.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /tenants/all:
 *   get:
 *     summary: Retrieve all tenants (SuperAdmin only)
 *     description: Retrieves all tenants with pagination, sorting, search, and filtering. Only SuperAdmin can access this endpoint.
 *     tags: [Tenants]
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
 *           enum: [name, schemaName, isActive, createdAt, updatedAt]
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
 *         description: Search term to filter tenants by name or schema name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *     responses:
 *       200:
 *         description: Tenants retrieved successfully
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
 *                   example: 'Tenants retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tenant'
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
  '/all',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(tenantListSchema, 'query'),
  getAllTenants
)

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: Retrieve user's tenants
 *     description: Retrieves tenants that the authenticated user belongs to, with pagination, sorting, search, and filtering.
 *     tags: [Tenants]
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
 *           enum: [name, schemaName, isActive, createdAt, updatedAt]
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
 *         description: Search term to filter tenants by name or schema name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *     responses:
 *       200:
 *         description: Tenants retrieved successfully
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
 *                   example: 'Tenants retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tenant'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/',
  authenticate,
  validate(tenantListSchema, 'query'),
  getUserTenants
)

/**
 * @swagger
 * /tenants:
 *   post:
 *     summary: Create a new tenant (onboard)
 *     description: Creates a new tenant with database schema. Users should be created separately and then associated with the tenant. Only SuperAdmin can create tenants.
 *     tags: [Tenants]
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
 *               - schemaName
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: 'Acme Corporation'
 *               schemaName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 63
 *                 pattern: '^[a-z][a-z0-9_]*$'
 *                 example: 'acme_corp'
 *                 description: Schema name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores
 *     responses:
 *       201:
 *         description: Tenant onboarded successfully
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
 *                   example: 'Tenant onboarded successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       400:
 *         description: Validation error or invalid schema name
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
 *       409:
 *         description: Tenant schema already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(createTenantSchema),
  createTenantController
)

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: Retrieve a specific tenant by ID
 *     description: Retrieves a specific tenant by their ID with associated users.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID (UUID)
 *     responses:
 *       200:
 *         description: Tenant retrieved successfully
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
 *                   example: 'Tenant retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
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
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:id',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(tenantIdSchema, 'params'),
  getTenantById
)

/**
 * @swagger
 * /tenants/{id}:
 *   patch:
 *     summary: Update a tenant
 *     description: Updates tenant information. Only SuperAdmin can update tenants.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: 'Acme Corporation Updated'
 *               isActive:
 *                 type: boolean
 *                 description: true to activate, false to deactivate
 *                 example: true
 *     responses:
 *       200:
 *         description: Tenant updated successfully
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
 *                   example: 'Tenant updated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
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
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(tenantIdSchema, 'params'),
  validate(updateTenantSchema),
  updateTenantController
)

/**
 * @swagger
 * /tenants/{id}:
 *   delete:
 *     summary: Delete a tenant (SuperAdmin only)
 *     description: Soft deletes a tenant by their ID. The tenant is marked as deleted but not permanently removed from the database. Only SuperAdmin can delete tenants.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID (UUID)
 *     responses:
 *       200:
 *         description: Tenant deleted successfully
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
 *                   example: 'Tenant deleted successfully'
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
 *         description: User not authorized (SuperAdmin only)
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
 */
router.delete(
  '/:id',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(tenantIdSchema, 'params'),
  deleteTenantById
)

/**
 * @swagger
 * /tenants/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted tenant
 *     description: Restores a soft-deleted tenant by clearing the deleted_at timestamp.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID (UUID)
 *     responses:
 *       200:
 *         description: Tenant restored successfully
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
 *                   example: 'Tenant restored successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
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
 *         description: Tenant not found or not deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/restore',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN] }),
  validate(tenantIdSchema, 'params'),
  restoreTenantById
)

/**
 * @swagger
 * /tenants/{id}/switch:
 *   post:
 *     summary: Switch user's primary tenant
 *     description: Switches the authenticated user's primary tenant and updates the JWT token with the new selectedTenantId.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID to switch to
 *     responses:
 *       200:
 *         description: Tenant switched successfully
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
 *                   example: 'Tenant switched successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New access token with updated selectedTenantId
 *                     refreshToken:
 *                       type: string
 *                       description: New refresh token
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User does not belong to this tenant
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
 */
router.post(
  '/:id/switch',
  authenticate,
  validate(tenantIdSchema, 'params'),
  switchTenant
)

export default router
