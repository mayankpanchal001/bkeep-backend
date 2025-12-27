import { Router, type Router as RouterType } from 'express'

import {
  disableTotp,
  downloadBackupCodes,
  getTotpStatus,
  regenerateBackupCodes,
  setupTotp,
  verifyAndEnableTotp,
} from '@controllers/authenticator.controller'
import { authenticate } from '@middlewares/auth.middleware'
import { validate } from '@middlewares/validate.middleware'
import { totpVerifySchema } from '@schema/auth.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /authenticator/setup:
 *   post:
 *     summary: Setup TOTP authenticator
 *     description: Generates TOTP secret and QR code for user to scan with authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
 *     tags: [Authenticator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP setup initiated successfully
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
 *                   example: 'TOTP authenticator setup initiated'
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                       description: TOTP secret (base32 encoded)
 *                       example: 'JBSWY3DPEHPK3PXP'
 *                     qrCode:
 *                       type: string
 *                       description: QR code as data URL (base64 encoded PNG)
 *                       example: 'data:image/png;base64,iVBORw0KG...'
 *                     backupCodes:
 *                       type: array
 *                       description: Backup codes for account recovery
 *                       items:
 *                         type: string
 *                       example: ['A1B2C3D4', 'E5F6G7H8']
 *       400:
 *         description: TOTP already enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: 'TOTP authenticator is already enabled'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: 'User not authenticated'
 */
router.post('/setup', authenticate, setupTotp)

/**
 * @swagger
 * /authenticator/verify:
 *   post:
 *     summary: Verify and enable TOTP authenticator
 *     description: Verifies TOTP code and enables TOTP for the user
 *     tags: [Authenticator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: 6-digit TOTP code from authenticator app
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: TOTP enabled successfully
 *       400:
 *         description: TOTP not setup or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: 'TOTP setup is required'
 *       401:
 *         description: Invalid TOTP code or user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: 'Invalid TOTP code or user not authenticated'
 */
router.post(
  '/verify',
  authenticate,
  validate(totpVerifySchema),
  verifyAndEnableTotp
)

/**
 * @swagger
 * /authenticator/deactivate:
 *   post:
 *     summary: Deactivate TOTP authenticator
 *     description: Deactivates TOTP and removes secret and backup codes
 *     tags: [Authenticator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP deactivated successfully
 *       400:
 *         description: TOTP not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: 'TOTP authenticator is not enabled'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: 'User not authenticated'
 */
router.post('/deactivate', authenticate, disableTotp)

/**
 * @swagger
 * /authenticator/status:
 *   get:
 *     summary: Get TOTP status
 *     description: Retrieves the current TOTP (Time-based One-Time Password) status for the authenticated user
 *     tags: [Authenticator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP status retrieved successfully
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
 *                   example: 'TOTP status retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     totpEnabled:
 *                       type: boolean
 *                       description: Whether TOTP is enabled for the user
 *                       example: true
 *                     mfaEnabled:
 *                       type: boolean
 *                       description: Whether MFA is enabled for the user
 *                       example: true
 *                     mfaType:
 *                       type: string
 *                       enum: [email, totp]
 *                       description: Type of MFA enabled (email or totp)
 *                       example: 'totp'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: 'User not authenticated'
 */
router.get('/status', authenticate, getTotpStatus)

/**
 * @swagger
 * /authenticator/backup-codes:
 *   post:
 *     summary: Regenerate backup codes
 *     description: Generates new backup codes for the authenticated user (replaces old codes)
 *     tags: [Authenticator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
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
 *                   example: 'Backup codes generated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ['A1B2C3D4', 'E5F6G7H8']
 *       400:
 *         description: TOTP not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: 'TOTP authenticator is not enabled'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: 'User not authenticated'
 */
router.post('/backup-codes', authenticate, regenerateBackupCodes)

/**
 * @swagger
 * /authenticator/backup-codes/download:
 *   get:
 *     summary: Download backup codes
 *     description: Downloads remaining backup codes as a text file for the authenticated user
 *     tags: [Authenticator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes downloaded successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 BKeep - Backup Codes
 *
 *                 These are your backup codes for two-factor authentication.
 *                 Each code can only be used once.
 *
 *                 IMPORTANT: Store these codes in a safe place. If you lose access to your authenticator app, you can use these codes to sign in.
 *
 *                 Backup Codes:
 *                 1. A1B2C3D4
 *                 2. E5F6G7H8
 *                 ...
 *       400:
 *         description: TOTP not enabled or backup codes not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: 'TOTP not enabled or backup codes not available'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: 'User not authenticated'
 */
router.get('/backup-codes/download', authenticate, downloadBackupCodes)

export default router
