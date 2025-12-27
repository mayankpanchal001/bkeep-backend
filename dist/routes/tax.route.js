"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tax_controller_1 = require("../controllers/tax.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const tax_schema_1 = require("../schema/tax.schema");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /taxes:
 *   get:
 *     summary: Retrieve all taxes
 *     description: Retrieves all taxes for the authenticated user's tenant with pagination, sorting, search, and filtering.
 *     tags: [Taxes]
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
 *           enum: [name, type, rate, isActive, createdAt, updatedAt]
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
 *         description: Search term to filter taxes by name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by activation status (true/false)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [normal, compound, withholding]
 *         description: Filter by tax type
 *     responses:
 *       200:
 *         description: Taxes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 'Taxes retrieved successfully'
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
 *                                 example: '123e4567-e89b-12d3-a456-426614174000'
 *                               name:
 *                                 type: string
 *                                 example: 'GST'
 *                               type:
 *                                 type: string
 *                                 enum: [normal, compound, withholding]
 *                                 example: 'normal'
 *                               rate:
 *                                 type: number
 *                                 example: 5.0
 *                               isActive:
 *                                 type: boolean
 *                                 example: true
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
router.get("/", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxListSchema, "query"), tax_controller_1.getAllTaxes);
/**
 * @swagger
 * /taxes/active:
 *   get:
 *     summary: Get all active taxes
 *     description: Retrieves only active taxes (no pagination).
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active taxes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 'Active taxes retrieved successfully'
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
 *                       type:
 *                         type: string
 *                         enum: [normal, compound, withholding]
 *                       rate:
 *                         type: number
 *                       isActive:
 *                         type: boolean
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
router.get("/active", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, tax_controller_1.getActiveTaxes);
/**
 * @swagger
 * /taxes/stats:
 *   get:
 *     summary: Get tax statistics
 *     description: Retrieves aggregate statistics about taxes for the authenticated user's tenant.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tax statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     active:
 *                       type: number
 *                     inactive:
 *                       type: number
 *                     byType:
 *                       type: object
 *                       properties:
 *                         normal:
 *                           type: number
 *                         compound:
 *                           type: number
 *                         withholding:
 *                           type: number
 *                     averageRate:
 *                       type: number
 *                     recentTaxes:
 *                       type: array
 *       401:
 *         description: User not authenticated
 */
router.get("/stats", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, tax_controller_1.getTaxStatisticsController);
/**
 * @swagger
 * /taxes/{id}:
 *   get:
 *     summary: Retrieve a specific tax by ID
 *     description: Retrieves a specific tax by their ID for the authenticated user's tenant.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax ID (UUID)
 *     responses:
 *       200:
 *         description: Tax retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 'Tax retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [normal, compound, withholding]
 *                     rate:
 *                       type: number
 *                     isActive:
 *                       type: boolean
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
 *         description: Tax not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxIdSchema, "params"), tax_controller_1.getTaxById);
/**
 * @swagger
 * /taxes/{id}/status:
 *   get:
 *     summary: Get tax status
 *     description: Retrieves the status information of a specific tax.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax ID (UUID)
 *     responses:
 *       200:
 *         description: Tax status retrieved successfully
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
 *                     isActive:
 *                       type: boolean
 *                     isDeleted:
 *                       type: boolean
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
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
 *         description: Tax not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id/status", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxIdSchema, "params"), tax_controller_1.getTaxStatusController);
/**
 * @swagger
 * /taxes:
 *   post:
 *     summary: Create a new tax
 *     description: Creates a new tax in the authenticated user's tenant schema.
 *     tags: [Taxes]
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
 *               - type
 *               - rate
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               type:
 *                 type: string
 *                 enum: [normal, compound, withholding]
 *                 default: normal
 *               rate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               isActive:
 *                 type: boolean
 *                 default: true
 *           example:
 *             name: 'GST'
 *             type: 'normal'
 *             rate: 5.0
 *             isActive: true
 *     responses:
 *       201:
 *         description: Tax created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: 'Tax created successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     rate:
 *                       type: number
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
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
 */
router.post("/", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.createTaxSchema, "body"), tax_controller_1.createTaxController);
/**
 * @swagger
 * /taxes/{id}:
 *   put:
 *     summary: Update a tax
 *     description: Updates tax information for the authenticated user's tenant.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax ID (UUID)
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
 *               type:
 *                 type: string
 *                 enum: [normal, compound, withholding]
 *               rate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               isActive:
 *                 type: boolean
 *           example:
 *             name: 'Updated GST'
 *             rate: 6.0
 *             isActive: true
 *     responses:
 *       200:
 *         description: Tax updated successfully
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
 *         description: Tax not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxIdSchema, "params"), (0, validate_middleware_1.validate)(tax_schema_1.updateTaxSchema, "body"), tax_controller_1.updateTaxController);
/**
 * @swagger
 * /taxes/{id}:
 *   delete:
 *     summary: Delete a tax
 *     description: Soft deletes a tax by their ID. The tax is marked as deleted but not permanently removed from the database.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax ID (UUID)
 *     responses:
 *       200:
 *         description: Tax deleted successfully
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
 *         description: Tax not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxIdSchema, "params"), tax_controller_1.deleteTaxById);
/**
 * @swagger
 * /taxes/{id}/enable:
 *   patch:
 *     summary: Enable a tax
 *     description: Enables a tax by setting isActive to true.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax ID (UUID)
 *     responses:
 *       200:
 *         description: Tax enabled successfully
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
 *         description: Tax not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/enable", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxIdSchema, "params"), tax_controller_1.enableTax);
/**
 * @swagger
 * /taxes/{id}/disable:
 *   patch:
 *     summary: Disable a tax
 *     description: Disables a tax by setting isActive to false.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax ID (UUID)
 *     responses:
 *       200:
 *         description: Tax disabled successfully
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
 *         description: Tax not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/disable", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxIdSchema, "params"), tax_controller_1.disableTax);
/**
 * @swagger
 * /taxes/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted tax
 *     description: Restores a soft-deleted tax by clearing the deleted_at timestamp.
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tax ID (UUID)
 *     responses:
 *       200:
 *         description: Tax restored successfully
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
 *         description: Tax not found or not deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/restore", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(tax_schema_1.taxIdSchema, "params"), tax_controller_1.restoreTaxById);
exports.default = router;
