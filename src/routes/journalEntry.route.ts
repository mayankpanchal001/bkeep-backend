import { Router, type Router as RouterType } from 'express'

import {
  createJournalEntryController,
  deleteJournalEntryById,
  duplicateJournalEntryController,
  getAllJournalEntries,
  getJournalEntryById,
  postJournalEntryController,
  restoreJournalEntryById,
  reverseJournalEntryController,
  updateJournalEntryController,
  voidJournalEntryController,
} from '@controllers/journalEntry.controller'
import { authenticate } from '@middlewares/auth.middleware'
import {
  requireTenantContext,
  setTenantContext,
} from '@middlewares/tenantContext.middleware'
import { validate } from '@middlewares/validate.middleware'
import {
  createJournalEntrySchema,
  duplicateJournalEntrySchema,
  journalEntryIdSchema,
  journalEntryListSchema,
  postJournalEntrySchema,
  reverseJournalEntrySchema,
  updateJournalEntrySchema,
  voidJournalEntrySchema,
} from '@schema/journalEntry.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /journal-entries:
 *   get:
 *     summary: Retrieve all journal entries
 *     description: Retrieves all journal entries for the authenticated user's tenant with pagination, sorting, search, and filtering.
 *     tags: [Journal Entries]
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
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [entryNumber, entryDate, entryType, status, totalDebit, totalCredit, createdAt, updatedAt]
 *           default: entryDate
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
 *         description: Search term to filter entries by number, description, or reference
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, posted, voided]
 *         description: Filter by status
 *       - in: query
 *         name: entryType
 *         schema:
 *           type: string
 *           enum: [standard, adjusting, closing, reversing]
 *         description: Filter by entry type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter entries from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter entries until this date (YYYY-MM-DD format)
 *       - in: query
 *         name: sourceModule
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by source module
 *     responses:
 *       200:
 *         description: Journal entries retrieved successfully
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
 *                   example: 'Journal entries fetched successfully'
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
 *                               entryNumber:
 *                                 type: string
 *                                 nullable: true
 *                                 example: 'JE-2025-001'
 *                               entryDate:
 *                                 type: string
 *                                 format: date
 *                                 example: '2025-12-18'
 *                               entryType:
 *                                 type: string
 *                                 enum: [standard, adjusting, closing, reversing]
 *                               status:
 *                                 type: string
 *                                 enum: [draft, posted, voided]
 *                               totalDebit:
 *                                 type: number
 *                               totalCredit:
 *                                 type: number
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
  validate(journalEntryListSchema, 'query'),
  getAllJournalEntries
)

/**
 * @swagger
 * /journal-entries/{id}:
 *   get:
 *     summary: Retrieve a specific journal entry by ID
 *     description: Retrieves a specific journal entry by its ID for the authenticated user's tenant.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID)
 *     responses:
 *       200:
 *         description: Journal entry retrieved successfully
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
 *                   example: 'Journal entry fetched successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       nullable: true
 *                     entryDate:
 *                       type: string
 *                       format: date
 *                     entryType:
 *                       type: string
 *                       enum: [standard, adjusting, closing, reversing]
 *                     status:
 *                       type: string
 *                       enum: [draft, posted, voided]
 *                     totalDebit:
 *                       type: number
 *                     totalCredit:
 *                       type: number
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
 *         description: Journal entry not found
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
  validate(journalEntryIdSchema, 'params'),
  getJournalEntryById
)

/**
 * @swagger
 * /journal-entries:
 *   post:
 *     summary: Create a new journal entry
 *     description: Creates a new journal entry with lines in the authenticated user's tenant schema. Entry must be balanced (debits = credits).
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entryDate
 *               - lines
 *             properties:
 *               entryNumber:
 *                 type: string
 *                 maxLength: 100
 *               entryDate:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2025-12-16'
 *                 description: Entry date in YYYY-MM-DD format
 *               entryType:
 *                 type: string
 *                 enum: [standard, adjusting, closing, reversing]
 *                 default: standard
 *               isAdjusting:
 *                 type: boolean
 *                 default: false
 *               isClosing:
 *                 type: boolean
 *                 default: false
 *               isReversing:
 *                 type: boolean
 *                 default: false
 *               reversalDate:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2025-12-16'
 *                 nullable: true
 *                 description: Reversal date in YYYY-MM-DD format
 *               description:
 *                 type: string
 *               reference:
 *                 type: string
 *                 maxLength: 255
 *               memo:
 *                 type: string
 *                 description: General memo/notes for the journal entry
 *               sourceModule:
 *                 type: string
 *                 maxLength: 100
 *               sourceId:
 *                 type: string
 *                 format: uuid
 *               lines:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required:
 *                     - accountId
 *                   properties:
 *                     accountId:
 *                       type: string
 *                       format: uuid
 *                     lineNumber:
 *                       type: integer
 *                       minimum: 1
 *                     debit:
 *                       type: number
 *                       minimum: 0
 *                       default: 0
 *                     credit:
 *                       type: number
 *                       minimum: 0
 *                       default: 0
 *                     description:
 *                       type: string
 *                     memo:
 *                       type: string
 *                     contactId:
 *                       type: string
 *                       format: uuid
 *                       description: Reference to contact (customer/vendor)
 *     responses:
 *       201:
 *         description: Journal entry created successfully
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
 *                   example: 'Journal entry created successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       nullable: true
 *                     entryDate:
 *                       type: string
 *                       format: date
 *                     entryType:
 *                       type: string
 *                     status:
 *                       type: string
 *                     totalDebit:
 *                       type: number
 *                     totalCredit:
 *                       type: number
 *       400:
 *         description: Validation error or entry not balanced
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
 *       409:
 *         description: Entry number already exists
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
  validate(createJournalEntrySchema),
  createJournalEntryController
)

/**
 * @swagger
 * /journal-entries/{id}:
 *   put:
 *     summary: Update a journal entry
 *     description: Updates journal entry information. Only draft entries can be updated.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entryNumber:
 *                 type: string
 *                 maxLength: 100
 *               entryDate:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2025-12-16'
 *                 description: Entry date in YYYY-MM-DD format
 *               entryType:
 *                 type: string
 *                 enum: [standard, adjusting, closing, reversing]
 *               isAdjusting:
 *                 type: boolean
 *               isClosing:
 *                 type: boolean
 *               isReversing:
 *                 type: boolean
 *               reversalDate:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2025-12-16'
 *                 nullable: true
 *                 description: Reversal date in YYYY-MM-DD format
 *               description:
 *                 type: string
 *                 nullable: true
 *               reference:
 *                 type: string
 *                 maxLength: 255
 *                 nullable: true
 *               memo:
 *                 type: string
 *                 nullable: true
 *                 description: General memo/notes for the journal entry
 *               sourceModule:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *               sourceId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Journal entry updated successfully
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
 *                   example: 'Journal entry updated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       nullable: true
 *                     entryDate:
 *                       type: string
 *                       format: date
 *                     entryType:
 *                       type: string
 *                     status:
 *                       type: string
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
 *         description: Cannot modify posted or voided entry, or tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Journal entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Entry number already exists
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
  validate(journalEntryIdSchema, 'params'),
  validate(updateJournalEntrySchema),
  updateJournalEntryController
)

/**
 * @swagger
 * /journal-entries/{id}/post:
 *   post:
 *     summary: Post a journal entry
 *     description: Posts a draft journal entry, updating chart of accounts balances. Entry must be balanced and validated.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approved:
 *                 type: boolean
 *                 default: false
 *               approvedBy:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Journal entry posted successfully
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
 *                   example: 'Journal entry posted successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
 *                       enum: [posted]
 *                     totalDebit:
 *                       type: number
 *                     totalCredit:
 *                       type: number
 *       400:
 *         description: Entry not balanced or validation failed
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
 *         description: Cannot post voided entry or tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Journal entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Entry already posted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:id/post',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(journalEntryIdSchema, 'params'),
  validate(postJournalEntrySchema, 'body'),
  postJournalEntryController
)

/**
 * @swagger
 * /journal-entries/{id}/void:
 *   post:
 *     summary: Void a journal entry
 *     description: Voids a draft journal entry. Only draft entries can be voided.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Journal entry voided successfully
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
 *                   example: 'Journal entry voided successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
 *                       enum: [voided]
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
 *         description: Cannot void posted entry or tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Journal entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Entry already voided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:id/void',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(journalEntryIdSchema, 'params'),
  validate(voidJournalEntrySchema, 'body'),
  voidJournalEntryController
)

/**
 * @swagger
 * /journal-entries/{id}/reverse:
 *   post:
 *     summary: Reverse a posted journal entry
 *     description: Creates a reversing entry for a posted journal entry. The reversing entry will have debits and credits swapped, and will automatically update Chart of Accounts balances to reverse the original entry.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID) of the posted entry to reverse
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reversalDate
 *             properties:
 *               reversalDate:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2025-12-16'
 *                 description: Date for the reversing entry in YYYY-MM-DD format
 *     responses:
 *       201:
 *         description: Journal entry reversed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Journal entry reversed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       example: JE-2024-002
 *                     entryDate:
 *                       type: string
 *                       format: date
 *                       example: '2025-12-16'
 *                       description: Entry date in YYYY-MM-DD format
 *                     entryType:
 *                       type: string
 *                       enum: [reversing]
 *                     isReversing:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       enum: [posted]
 *                     totalDebit:
 *                       type: number
 *                     totalCredit:
 *                       type: number
 *                     lines:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Validation error or reversal date missing
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
 *         description: Cannot reverse draft or voided entry, or tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Journal entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Entry already reversed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:id/reverse',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(journalEntryIdSchema, 'params'),
  validate(reverseJournalEntrySchema, 'body'),
  reverseJournalEntryController
)

/**
 * @swagger
 * /journal-entries/{id}:
 *   delete:
 *     summary: Delete a journal entry
 *     description: Soft deletes a journal entry by its ID. Only draft entries can be deleted.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID)
 *     responses:
 *       200:
 *         description: Journal entry deleted successfully
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
 *                   example: 'Journal entry deleted successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
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
 *         description: Cannot delete posted entry or tenant context required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Journal entry not found
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
  validate(journalEntryIdSchema, 'params'),
  deleteJournalEntryById
)

/**
 * @swagger
 * /journal-entries/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted journal entry
 *     description: Restores a soft-deleted journal entry by clearing the deleted_at timestamp.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID)
 *     responses:
 *       200:
 *         description: Journal entry restored successfully
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
 *                   example: 'Journal entry restored successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
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
 *         description: Journal entry not found or not deleted
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
  validate(journalEntryIdSchema, 'params'),
  restoreJournalEntryById
)

/**
 * @swagger
 * /journal-entries/{id}/duplicate:
 *   post:
 *     summary: Duplicate a journal entry
 *     description: Creates a new journal entry by duplicating an existing entry. The new entry will have all the same lines and data, but will be created as a draft with a new entry number.
 *     tags: [Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Journal entry ID (UUID) to duplicate
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entryDate:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2025-12-18'
 *                 description: Optional entry date for the duplicated entry (defaults to original entry date)
 *               entryNumber:
 *                 type: string
 *                 maxLength: 100
 *                 description: Optional entry number for the duplicated entry (defaults to auto-generated)
 *     responses:
 *       201:
 *         description: Journal entry duplicated successfully
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
 *                   example: 'Journal entry duplicated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     entryNumber:
 *                       type: string
 *                       nullable: true
 *                     entryDate:
 *                       type: string
 *                       format: date
 *                     entryType:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [draft]
 *                     totalDebit:
 *                       type: number
 *                     totalCredit:
 *                       type: number
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
 *         description: Journal entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Entry number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:id/duplicate',
  authenticate,
  setTenantContext,
  requireTenantContext,
  validate(journalEntryIdSchema, 'params'),
  validate(duplicateJournalEntrySchema, 'body'),
  duplicateJournalEntryController
)

export default router
