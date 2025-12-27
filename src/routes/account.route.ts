import { Router, type Router as RouterType } from 'express'

import {
  activateAccount,
  createAccountController,
  deactivateAccount,
  deleteAccountById,
  getAccountById,
  getAccountStatus,
  getAllAccounts,
  restoreAccountById,
  updateAccountController,
} from '@controllers/account.controller'
import { authenticate } from '@middlewares/auth.middleware'
import {
  requireTenantContext,
  setTenantContext,
} from '@middlewares/tenantContext.middleware'
import { validate } from '@middlewares/validate.middleware'
import {
  accountIdSchema,
  accountListSchema,
  createAccountSchema,
  updateAccountSchema,
} from '@schema/account.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Retrieve all accounts
 *     description: Retrieves all accounts for the authenticated user's tenant with pagination, sorting, search, and filtering.
 *     tags: [Accounts]
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
 *           enum: [name, number, currencyCode, openingBalance, isActive, createdAt, updatedAt]
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
 *         description: Search term to filter accounts by name or number
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by activation status (true/false)
 *       - in: query
 *         name: currencyCode
 *         schema:
 *           type: string
 *           length: 3
 *         description: Filter by currency code (ISO 4217, e.g., CAD, USD)
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
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
 *                   example: 'Accounts retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Account'
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
  setTenantContext,
  requireTenantContext,
  validate(accountListSchema, 'query'),
  getAllAccounts
)

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Retrieve a specific account by ID
 *     description: Retrieves a specific account by their ID for the authenticated user's tenant.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID (UUID)
 *     responses:
 *       200:
 *         description: Account retrieved successfully
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
 *                   example: 'Account retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
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
  validate(accountIdSchema, 'params'),
  getAccountById
)

/**
 * @swagger
 * /accounts/{id}/status:
 *   get:
 *     summary: Get account status
 *     description: Retrieves the status information of an account.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID (UUID)
 *     responses:
 *       200:
 *         description: Account status retrieved successfully
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
 *                   example: 'Account status retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: '123e4567-e89b-12d3-a456-426614174000'
 *                     name:
 *                       type: string
 *                       example: 'Checking Account'
 *                     isActive:
 *                       type: boolean
 *                       description: Whether the account is active
 *                       example: true
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:id/status',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(accountIdSchema, 'params'),
  getAccountStatus
)

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     description: Creates a new account in the authenticated user's tenant schema.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAccountRequest'
 *     responses:
 *       201:
 *         description: Account created successfully
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
 *                   example: 'Account created successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Account'
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
router.post(
  '/',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(createAccountSchema),
  createAccountController
)

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Update an account
 *     description: Updates account information for the authenticated user's tenant.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAccountRequest'
 *     responses:
 *       200:
 *         description: Account updated successfully
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
 *                   example: 'Account updated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Account'
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
 *       404:
 *         description: Account not found
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
  validate(accountIdSchema, 'params'),
  validate(updateAccountSchema),
  updateAccountController
)

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account
 *     description: Soft deletes an account by their ID. The account is marked as deleted but not permanently removed from the database.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID (UUID)
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *                   example: 'Account deleted successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
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
  validate(accountIdSchema, 'params'),
  deleteAccountById
)

/**
 * @swagger
 * /accounts/{id}/activate:
 *   patch:
 *     summary: Activate an account
 *     description: Activates an account by setting isActive to true.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID (UUID)
 *     responses:
 *       200:
 *         description: Account activated successfully
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
 *                   example: 'Account activated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/activate',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(accountIdSchema, 'params'),
  activateAccount
)

/**
 * @swagger
 * /accounts/{id}/deactivate:
 *   patch:
 *     summary: Deactivate an account
 *     description: Deactivates an account by setting isActive to false.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID (UUID)
 *     responses:
 *       200:
 *         description: Account deactivated successfully
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
 *                   example: 'Account deactivated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/deactivate',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(accountIdSchema, 'params'),
  deactivateAccount
)

/**
 * @swagger
 * /accounts/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted account
 *     description: Restores a soft-deleted account by clearing the deleted_at timestamp.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID (UUID)
 *     responses:
 *       200:
 *         description: Account restored successfully
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
 *                   example: 'Account restored successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found or not deleted
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
  validate(accountIdSchema, 'params'),
  restoreAccountById
)

export default router
