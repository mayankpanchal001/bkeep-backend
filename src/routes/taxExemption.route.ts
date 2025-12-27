import { Router, type Router as RouterType } from 'express'

import {
  createTaxExemptionController,
  deleteTaxExemptionById,
  disableTaxExemption,
  enableTaxExemption,
  getAllTaxExemptions,
  getTaxExemptionById,
  restoreTaxExemptionById,
  updateTaxExemptionController,
} from '@controllers/taxExemption.controller'
import { authenticate } from '@middlewares/auth.middleware'
import {
  requireTenantContext,
  setTenantContext,
} from '@middlewares/tenantContext.middleware'
import { validate } from '@middlewares/validate.middleware'
import {
  createTaxExemptionSchema,
  taxExemptionIdSchema,
  taxExemptionListSchema,
  updateTaxExemptionSchema,
} from '@schema/taxExemption.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /tax-exemptions:
 *   get:
 *     summary: Retrieve all tax exemptions
 *     description: Retrieves all tax exemptions for the authenticated user's tenant with pagination, sorting, search, and filtering.
 *     tags: [Tax Exemptions]
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
 *           enum: [exemptionType, certificateExpiry, isActive, createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Search term to filter exemptions by certificate number or reason
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by activation status (true/false)
 *       - in: query
 *         name: contactId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by contact ID
 *       - in: query
 *         name: taxId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by tax ID (null for all-tax exemptions)
 *       - in: query
 *         name: exemptionType
 *         schema:
 *           type: string
 *           enum: [resale, non_profit, government, other]
 *         description: Filter by exemption type
 *       - in: query
 *         name: expired
 *         schema:
 *           type: boolean
 *         description: Filter by certificate expiry status (true for expired, false for not expired)
 *     responses:
 *       200:
 *         description: Tax exemptions retrieved successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           contactId:
 *                             type: string
 *                             format: uuid
 *                           taxId:
 *                             type: string
 *                             format: uuid
 *                             nullable: true
 *                           exemptionType:
 *                             type: string
 *                             enum: [resale, non_profit, government, other]
 *                           certificateNumber:
 *                             type: string
 *                             nullable: true
 *                           certificateExpiry:
 *                             type: string
 *                             format: date
 *                             nullable: true
 *                           reason:
 *                             type: string
 *                             nullable: true
 *                           isActive:
 *                             type: boolean
 *                           tax:
 *                             type: object
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
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
  validate(taxExemptionListSchema, 'query'),
  getAllTaxExemptions
)

/**
 * @swagger
 * /tax-exemptions/{id}:
 *   get:
 *     summary: Get tax exemption by ID
 *     description: Retrieves a single tax exemption by ID with associated tax information.
 *     tags: [Tax Exemptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax exemption ID (UUID)
 *     responses:
 *       200:
 *         description: Tax exemption retrieved successfully
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
 *                     contactId:
 *                       type: string
 *                       format: uuid
 *                     taxId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     exemptionType:
 *                       type: string
 *                     certificateNumber:
 *                       type: string
 *                       nullable: true
 *                     certificateExpiry:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     reason:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     tax:
 *                       type: object
 *                       nullable: true
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
 *         description: Tax exemption not found
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
  validate(taxExemptionIdSchema, 'params'),
  getTaxExemptionById
)

/**
 * @swagger
 * /tax-exemptions:
 *   post:
 *     summary: Create a new tax exemption
 *     description: Creates a new tax exemption for a contact. If taxId is null, the exemption applies to all taxes.
 *     tags: [Tax Exemptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactId
 *               - exemptionType
 *             properties:
 *               contactId:
 *                 type: string
 *                 format: uuid
 *                 description: Contact ID (customer or vendor)
 *               taxId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Tax ID (null for all-tax exemption)
 *               exemptionType:
 *                 type: string
 *                 enum: [resale, non_profit, government, other]
 *                 default: resale
 *               certificateNumber:
 *                 type: string
 *                 maxLength: 255
 *                 description: Tax exemption certificate number
 *               certificateExpiry:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Certificate expiry date (YYYY-MM-DD)
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Reason for exemption
 *               isActive:
 *                 type: boolean
 *                 default: true
 *           example:
 *             contactId: '123e4567-e89b-12d3-a456-426614174000'
 *             taxId: '123e4567-e89b-12d3-a456-426614174001'
 *             exemptionType: 'resale'
 *             certificateNumber: 'EX-12345'
 *             certificateExpiry: '2025-12-31'
 *             reason: 'Resale certificate for wholesale purchases'
 *             isActive: true
 *     responses:
 *       201:
 *         description: Tax exemption created successfully
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
 *         description: Contact or tax not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Tax exemption already exists for this contact and tax
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
  validate(createTaxExemptionSchema, 'body'),
  createTaxExemptionController
)

/**
 * @swagger
 * /tax-exemptions/{id}:
 *   put:
 *     summary: Update a tax exemption
 *     description: Updates tax exemption information. All fields are optional.
 *     tags: [Tax Exemptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax exemption ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taxId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               exemptionType:
 *                 type: string
 *                 enum: [resale, non_profit, government, other]
 *               certificateNumber:
 *                 type: string
 *                 maxLength: 255
 *               certificateExpiry:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *               isActive:
 *                 type: boolean
 *           example:
 *             certificateNumber: 'EX-12345-UPDATED'
 *             certificateExpiry: '2026-12-31'
 *             reason: 'Updated reason'
 *             isActive: true
 *     responses:
 *       200:
 *         description: Tax exemption updated successfully
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
 *         description: Tax exemption not found
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
  validate(taxExemptionIdSchema, 'params'),
  validate(updateTaxExemptionSchema, 'body'),
  updateTaxExemptionController
)

/**
 * @swagger
 * /tax-exemptions/{id}:
 *   delete:
 *     summary: Delete a tax exemption
 *     description: Soft deletes a tax exemption. The exemption is marked as deleted but not permanently removed from the database.
 *     tags: [Tax Exemptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax exemption ID (UUID)
 *     responses:
 *       200:
 *         description: Tax exemption deleted successfully
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
 *         description: Tax exemption not found
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
  validate(taxExemptionIdSchema, 'params'),
  deleteTaxExemptionById
)

/**
 * @swagger
 * /tax-exemptions/{id}/enable:
 *   patch:
 *     summary: Enable a tax exemption
 *     description: Enables a tax exemption by setting isActive to true.
 *     tags: [Tax Exemptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax exemption ID (UUID)
 *     responses:
 *       200:
 *         description: Tax exemption enabled successfully
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
 *         description: Tax exemption not found
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
  validate(taxExemptionIdSchema, 'params'),
  enableTaxExemption
)

/**
 * @swagger
 * /tax-exemptions/{id}/disable:
 *   patch:
 *     summary: Disable a tax exemption
 *     description: Disables a tax exemption by setting isActive to false.
 *     tags: [Tax Exemptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax exemption ID (UUID)
 *     responses:
 *       200:
 *         description: Tax exemption disabled successfully
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
 *         description: Tax exemption not found
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
  validate(taxExemptionIdSchema, 'params'),
  disableTaxExemption
)

/**
 * @swagger
 * /tax-exemptions/{id}/restore:
 *   patch:
 *     summary: Restore a deleted tax exemption
 *     description: Restores a soft-deleted tax exemption by clearing the deleted_at timestamp.
 *     tags: [Tax Exemptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax exemption ID (UUID)
 *     responses:
 *       200:
 *         description: Tax exemption restored successfully
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
 *         description: Tax exemption not found or not deleted
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
  validate(taxExemptionIdSchema, 'params'),
  restoreTaxExemptionById
)

export default router
