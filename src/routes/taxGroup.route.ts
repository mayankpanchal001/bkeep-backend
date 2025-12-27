import { Router, type Router as RouterType } from 'express'

import {
  calculateTaxGroupController,
  createTaxGroupController,
  deleteTaxGroupById,
  disableTaxGroup,
  enableTaxGroup,
  getActiveTaxGroups,
  getAllTaxGroups,
  getTaxGroupById,
  restoreTaxGroupById,
  updateTaxGroupController,
} from '@controllers/taxGroup.controller'
import { authenticate } from '@middlewares/auth.middleware'
import {
  requireTenantContext,
  setTenantContext,
} from '@middlewares/tenantContext.middleware'
import { validate } from '@middlewares/validate.middleware'
import {
  calculateTaxGroupSchema,
  createTaxGroupSchema,
  taxGroupIdSchema,
  taxGroupListSchema,
  updateTaxGroupSchema,
} from '@schema/taxGroup.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /tax-groups:
 *   get:
 *     summary: Retrieve all tax groups
 *     description: Retrieves all tax groups for the authenticated user's tenant with pagination, sorting, search, and filtering.
 *     tags: [Tax Groups]
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
 *           enum: [name, isActive, createdAt, updatedAt]
 *           default: name
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
 *         description: Search term to filter tax groups by name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by activation status (true/false)
 *     responses:
 *       200:
 *         description: Tax groups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                               isActive:
 *                                 type: boolean
 *                               taxes:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                       format: uuid
 *                                     name:
 *                                       type: string
 *                                     type:
 *                                       type: string
 *                                     rate:
 *                                       type: number
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupListSchema, 'query'),
  getAllTaxGroups
)

/**
 * @swagger
 * /tax-groups/active:
 *   get:
 *     summary: Retrieve active tax groups
 *     description: Retrieves only active tax groups for the authenticated user's tenant (no pagination).
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active tax groups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       isActive:
 *                         type: boolean
 *                       taxes:
 *                         type: array
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/active',
  authenticate,
  setTenantContext,
  requireTenantContext,
  getActiveTaxGroups
)

/**
 * @swagger
 * /tax-groups/{id}:
 *   get:
 *     summary: Get tax group by ID
 *     description: Retrieves a single tax group by ID with all associated taxes.
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax group ID (UUID)
 *     responses:
 *       200:
 *         description: Tax group retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     taxes:
 *                       type: array
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tax group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:id',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupIdSchema, 'params'),
  getTaxGroupById
)

/**
 * @swagger
 * /tax-groups:
 *   post:
 *     summary: Create a new tax group
 *     description: Creates a new tax group with associated taxes. Taxes are applied in the order specified in the taxIds array.
 *     tags: [Tax Groups]
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
 *               - taxIds
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: 'GST + PST'
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: 'Combined GST and PST tax group'
 *               taxIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001']
 *           example:
 *             name: 'GST + PST'
 *             description: 'Combined GST and PST tax group'
 *             taxIds:
 *               - '123e4567-e89b-12d3-a456-426614174000'
 *               - '123e4567-e89b-12d3-a456-426614174001'
 *     responses:
 *       201:
 *         description: Tax group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: One or more tax IDs not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(createTaxGroupSchema, 'body'),
  createTaxGroupController
)

/**
 * @swagger
 * /tax-groups/{id}:
 *   put:
 *     summary: Update a tax group
 *     description: Updates tax group information. If taxIds are provided, the tax group's taxes will be replaced.
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax group ID (UUID)
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
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               isActive:
 *                 type: boolean
 *               taxIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uuid
 *           example:
 *             name: 'Updated GST + PST'
 *             description: 'Updated description'
 *             isActive: true
 *     responses:
 *       200:
 *         description: Tax group updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tax group not found or one or more tax IDs not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  '/:id',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupIdSchema, 'params'),
  validate(updateTaxGroupSchema, 'body'),
  updateTaxGroupController
)

/**
 * @swagger
 * /tax-groups/{id}:
 *   delete:
 *     summary: Delete a tax group
 *     description: Soft deletes a tax group. The tax group is marked as deleted but not permanently removed from the database.
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax group ID (UUID)
 *     responses:
 *       200:
 *         description: Tax group deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tax group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/:id',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupIdSchema, 'params'),
  deleteTaxGroupById
)

/**
 * @swagger
 * /tax-groups/{id}/enable:
 *   patch:
 *     summary: Enable a tax group
 *     description: Enables a tax group by setting isActive to true.
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax group ID (UUID)
 *     responses:
 *       200:
 *         description: Tax group enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tax group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/enable',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupIdSchema, 'params'),
  enableTaxGroup
)

/**
 * @swagger
 * /tax-groups/{id}/disable:
 *   patch:
 *     summary: Disable a tax group
 *     description: Disables a tax group by setting isActive to false.
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax group ID (UUID)
 *     responses:
 *       200:
 *         description: Tax group disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tax group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/disable',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupIdSchema, 'params'),
  disableTaxGroup
)

/**
 * @swagger
 * /tax-groups/{id}/restore:
 *   patch:
 *     summary: Restore a deleted tax group
 *     description: Restores a soft-deleted tax group by clearing the deleted_at timestamp.
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax group ID (UUID)
 *     responses:
 *       200:
 *         description: Tax group restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tax group not found or not deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/restore',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupIdSchema, 'params'),
  restoreTaxGroupById
)

/**
 * @swagger
 * /tax-groups/{id}/calculate:
 *   post:
 *     summary: Calculate tax with tax group
 *     description: Calculates tax amount using a tax group. Handles compound taxes correctly (tax on tax).
 *     tags: [Tax Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax group ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 1000.00
 *           example:
 *             amount: 1000.00
 *     responses:
 *       200:
 *         description: Tax calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     baseAmount:
 *                       type: number
 *                     taxAmount:
 *                       type: number
 *                     totalAmount:
 *                       type: number
 *                     effectiveRate:
 *                       type: number
 *                     taxBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           taxId:
 *                             type: string
 *                             format: uuid
 *                           taxName:
 *                             type: string
 *                           taxType:
 *                             type: string
 *                           taxRate:
 *                             type: number
 *                           taxAmount:
 *                             type: number
 *                           isExempt:
 *                             type: boolean
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
 *         description: Tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tax group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:id/calculate',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(taxGroupIdSchema, 'params'),
  validate(calculateTaxGroupSchema, 'body'),
  calculateTaxGroupController
)

export default router
