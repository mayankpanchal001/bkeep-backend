"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passkey_controller_1 = require("../controllers/passkey.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const passkey_schema_1 = require("../schema/passkey.schema");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /passkey/register/options:
 *   post:
 *     summary: Generate passkey registration options
 *     description: Generates WebAuthn registration options for creating a new passkey credential
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registration options generated successfully
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
 *                   example: 'Passkey registration options generated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     options:
 *                       type: object
 *                       description: WebAuthn PublicKeyCredentialCreationOptions
 *       401:
 *         description: User not authenticated
 */
router.post("/register/options", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyRegistrationOptionsSchema), passkey_controller_1.generateRegistrationOptions);
/**
 * @swagger
 * /passkey/register/verify:
 *   post:
 *     summary: Verify and register a new passkey
 *     description: Verifies the WebAuthn credential creation response and registers the passkey
 *     tags: [Passkey]
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
 *               - credential
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'My iPhone'
 *                 description: Friendly name for the passkey
 *               credential:
 *                 type: object
 *                 description: WebAuthn credential creation response
 *     responses:
 *       201:
 *         description: Passkey registered successfully
 *       400:
 *         description: Validation error or verification failed
 *       401:
 *         description: User not authenticated
 */
router.post("/register/verify", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyRegistrationVerifySchema), passkey_controller_1.verifyRegistration);
/**
 * @swagger
 * /passkey:
 *   get:
 *     summary: List all passkeys for authenticated user
 *     description: Retrieves all passkeys registered for the current user
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: credentialType
 *         schema:
 *           type: string
 *           enum: [platform, roaming]
 *         description: Filter by credential type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Passkeys retrieved successfully
 *       401:
 *         description: User not authenticated
 */
router.get("/", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyListSchema, "query"), passkey_controller_1.listPasskeys);
/**
 * @swagger
 * /passkey/stats:
 *   get:
 *     summary: Get passkey statistics
 *     description: Retrieves passkey statistics for the authenticated user
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: User not authenticated
 */
router.get("/stats", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyStatsSchema, "query"), passkey_controller_1.getPasskeysStats);
/**
 * @swagger
 * /passkey/{id}:
 *   get:
 *     summary: Get a single passkey by ID
 *     description: Retrieves details of a specific passkey
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Passkey ID
 *     responses:
 *       200:
 *         description: Passkey retrieved successfully
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - not owner
 *       404:
 *         description: Passkey not found
 */
router.get("/:id", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyGetSchema, "params"), passkey_controller_1.getPasskey);
/**
 * @swagger
 * /passkey/{id}/rename:
 *   patch:
 *     summary: Rename a passkey
 *     description: Updates the friendly name of a passkey
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Passkey ID
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
 *                 example: 'My MacBook Pro'
 *     responses:
 *       200:
 *         description: Passkey renamed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - not owner
 *       404:
 *         description: Passkey not found
 */
router.patch("/:id/rename", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyRenameParamsSchema, "params"), (0, validate_middleware_1.validate)(passkey_schema_1.passkeyRenameSchema), passkey_controller_1.updatePasskeyName);
/**
 * @swagger
 * /passkey/{id}/enable:
 *   patch:
 *     summary: Enable a passkey
 *     description: Activates a passkey to allow it to be used for authentication
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Passkey ID
 *     responses:
 *       200:
 *         description: Passkey enabled successfully
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - not owner
 *       404:
 *         description: Passkey not found
 */
router.patch("/:id/enable", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyEnableSchema, "params"), passkey_controller_1.enablePasskey);
/**
 * @swagger
 * /passkey/{id}/disable:
 *   patch:
 *     summary: Disable a passkey
 *     description: Deactivates a passkey to prevent it from being used for authentication
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Passkey ID
 *     responses:
 *       200:
 *         description: Passkey disabled successfully
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - not owner
 *       404:
 *         description: Passkey not found
 */
router.patch("/:id/disable", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyDisableSchema, "params"), passkey_controller_1.disablePasskey);
/**
 * @swagger
 * /passkey/{id}:
 *   delete:
 *     summary: Delete a passkey
 *     description: Soft deletes a passkey credential
 *     tags: [Passkey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Passkey ID
 *     responses:
 *       200:
 *         description: Passkey deleted successfully
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - not owner
 *       404:
 *         description: Passkey not found
 */
router.delete("/:id", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyDeleteSchema, "params"), passkey_controller_1.removePasskey);
exports.default = router;
