"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chartOfAccount_controller_1 = require("../controllers/chartOfAccount.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const tenantContext_middleware_1 = require("../middlewares/tenantContext.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const chartOfAccount_schema_1 = require("../schema/chartOfAccount.schema");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /chart-of-accounts:
 *   get:
 *     summary: Retrieve all chart of accounts
 *     description: Retrieves all chart of accounts for the authenticated user's tenant with pagination, sorting, search, and filtering.
 *     tags: [Chart of Accounts]
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
 *           enum: [accountNumber, accountName, accountType, currentBalance, openingBalance, isActive, createdAt, updatedAt]
 *           default: accountName
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
 *         description: Search term to filter accounts by name, number, or description
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by activation status (true/false)
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: string
 *           enum: [asset, liability, equity, revenue, expense]
 *         description: Filter by account type
 *       - in: query
 *         name: accountSubtype
 *         schema:
 *           type: string
 *         description: Filter by account subtype
 *       - in: query
 *         name: parentAccountId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by parent account ID (null for top-level accounts)
 *     responses:
 *       200:
 *         description: Chart of accounts retrieved successfully
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: Chart of account not found
 */
router.get("/", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.chartOfAccountListSchema, "query"), chartOfAccount_controller_1.getAllChartOfAccounts);
/**
 * @swagger
 * /chart-of-accounts/hierarchy:
 *   get:
 *     summary: Get account hierarchy
 *     description: Retrieves top-level accounts with their children in hierarchical structure.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account hierarchy retrieved successfully
 *       401:
 *         description: User not authenticated
 */
router.get("/hierarchy", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, chartOfAccount_controller_1.getChartOfAccountHierarchy);
/**
 * @swagger
 * /chart-of-accounts/{id}:
 *   get:
 *     summary: Retrieve a specific chart of account by ID
 *     description: Retrieves a specific chart of account by their ID for the authenticated user's tenant.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chart of account ID (UUID)
 *     responses:
 *       200:
 *         description: Chart of account retrieved successfully
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: Chart of account not found
 */
router.get("/:id", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.chartOfAccountIdSchema, "params"), chartOfAccount_controller_1.getChartOfAccountById);
/**
 * @swagger
 * /chart-of-accounts:
 *   post:
 *     summary: Create a new chart of account
 *     description: Creates a new chart of account in the authenticated user's tenant schema.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountName
 *               - accountType
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 maxLength: 50
 *               accountName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               accountType:
 *                 type: string
 *                 enum: [asset, liability, equity, revenue, expense]
 *               accountSubtype:
 *                 type: string
 *                 maxLength: 100
 *               accountDetailType:
 *                 type: string
 *                 maxLength: 100
 *               parentAccountId:
 *                 type: string
 *                 format: uuid
 *               openingBalance:
 *                 type: number
 *                 default: 0
 *               currencyCode:
 *                 type: string
 *                 length: 3
 *                 default: CAD
 *               description:
 *                 type: string
 *               trackTax:
 *                 type: boolean
 *                 default: false
 *               defaultTaxId:
 *                 type: string
 *                 format: uuid
 *               bankAccountNumber:
 *                 type: string
 *                 maxLength: 100
 *               bankRoutingNumber:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       201:
 *         description: Chart of account created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: User not authenticated
 *       409:
 *         description: Account number already exists
 */
router.post("/", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.createChartOfAccountSchema, "body"), chartOfAccount_controller_1.createChartOfAccountController);
/**
 * @swagger
 * /chart-of-accounts/{id}:
 *   put:
 *     summary: Update a chart of account
 *     description: Updates chart of account information for the authenticated user's tenant.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chart of account ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 maxLength: 50
 *               accountName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               accountSubtype:
 *                 type: string
 *                 maxLength: 100
 *               accountDetailType:
 *                 type: string
 *                 maxLength: 100
 *               parentAccountId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               currencyCode:
 *                 type: string
 *                 length: 3
 *               description:
 *                 type: string
 *                 nullable: true
 *               trackTax:
 *                 type: boolean
 *               defaultTaxId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               bankAccountNumber:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *               bankRoutingNumber:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Chart of account updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Cannot modify system account
 *       404:
 *         description: Chart of account not found
 *       409:
 *         description: Account number already exists
 */
router.put("/:id", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.chartOfAccountIdSchema, "params"), (0, validate_middleware_1.validate)(chartOfAccount_schema_1.updateChartOfAccountSchema, "body"), chartOfAccount_controller_1.updateChartOfAccountController);
/**
 * @swagger
 * /chart-of-accounts/{id}:
 *   delete:
 *     summary: Delete a chart of account
 *     description: Soft deletes a chart of account by their ID. The account is marked as deleted but not permanently removed from the database.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chart of account ID (UUID)
 *     responses:
 *       200:
 *         description: Chart of account deleted successfully
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Cannot delete system account or account with children
 *       404:
 *         description: Chart of account not found
 *       409:
 *         description: Account has children and cannot be deleted
 */
router.delete("/:id", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.chartOfAccountIdSchema, "params"), chartOfAccount_controller_1.deleteChartOfAccountById);
/**
 * @swagger
 * /chart-of-accounts/{id}/enable:
 *   patch:
 *     summary: Enable a chart of account
 *     description: Enables a chart of account by setting isActive to true.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chart of account ID (UUID)
 *     responses:
 *       200:
 *         description: Chart of account enabled successfully
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
 *         description: Chart of account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/enable", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.chartOfAccountIdSchema, "params"), chartOfAccount_controller_1.enableChartOfAccount);
/**
 * @swagger
 * /chart-of-accounts/{id}/disable:
 *   patch:
 *     summary: Disable a chart of account
 *     description: Disables a chart of account by setting isActive to false.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chart of account ID (UUID)
 *     responses:
 *       200:
 *         description: Chart of account disabled successfully
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
 *         description: Chart of account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/disable", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.chartOfAccountIdSchema, "params"), chartOfAccount_controller_1.disableChartOfAccount);
/**
 * @swagger
 * /chart-of-accounts/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted chart of account
 *     description: Restores a soft-deleted chart of account by clearing the deleted_at timestamp.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chart of account ID (UUID)
 *     responses:
 *       200:
 *         description: Chart of account restored successfully
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: Chart of account not found or not deleted
 */
router.patch("/:id/restore", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, (0, validate_middleware_1.validate)(chartOfAccount_schema_1.chartOfAccountIdSchema, "params"), chartOfAccount_controller_1.restoreChartOfAccountById);
/**
 * @swagger
 * /chart-of-accounts/import/sample:
 *   get:
 *     summary: Download chart of accounts sample file
 *     description: Downloads an XLSX sample file for importing chart of accounts into Bkeep.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sample file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename="Bkeep_Chart_of_Accounts_Sample_File.xlsx"
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Tenant context required
 */
router.get("/import/sample", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, chartOfAccount_controller_1.downloadChartOfAccountSample);
/**
 * @swagger
 * /chart-of-accounts/import/fields:
 *   get:
 *     summary: Get available import fields
 *     description: Returns the list of fields that can be mapped during chart of accounts import.
 *     tags: [Chart of Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Import fields retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportFieldsResponse'
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
router.get("/import/fields", auth_middleware_1.authenticate, tenantContext_middleware_1.setTenantContext, tenantContext_middleware_1.requireTenantContext, chartOfAccount_controller_1.getImportFields);
exports.default = router;
