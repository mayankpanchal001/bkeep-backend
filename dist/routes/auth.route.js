"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const passkey_controller_1 = require("../controllers/passkey.controller");
const userInvitation_controller_1 = require("../controllers/userInvitation.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rateLimit_middleware_1 = require("../middlewares/rateLimit.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_schema_1 = require("../schema/auth.schema");
const passkey_schema_1 = require("../schema/passkey.schema");
const user_schema_1 = require("../schema/user.schema");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password, returns access and refresh tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'Validation failed: email: Invalid email format'
 *       401:
 *         description: Invalid credentials or email not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'Invalid email or password'
 */
router.post("/login", rateLimit_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.login);
/**
 * @swagger
 * /auth/passkey/login/options:
 *   post:
 *     summary: Generate passkey authentication options
 *     description: Generates WebAuthn authentication options for logging in with a passkey
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'user@example.com'
 *                 description: Optional - for usernameless authentication
 *     responses:
 *       200:
 *         description: Authentication options generated successfully
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
 *                   example: 'Passkey authentication options generated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     options:
 *                       type: object
 *                       description: WebAuthn PublicKeyCredentialRequestOptions
 */
router.post("/passkey/login/options", rateLimit_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyAuthenticationOptionsSchema), passkey_controller_1.generateAuthenticationOptions);
/**
 * @swagger
 * /auth/passkey/login/verify:
 *   post:
 *     summary: Verify passkey authentication and complete login
 *     description: Verifies the WebAuthn authentication response and returns JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: object
 *                 description: WebAuthn authentication response
 *     responses:
 *       200:
 *         description: Authentication successful, returns tokens and user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error or verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credential
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/passkey/login/verify", rateLimit_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(passkey_schema_1.passkeyAuthenticationVerifySchema), passkey_controller_1.verifyAuthentication);
/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access and refresh tokens
 *     description: Renews both access token and refresh token using a valid refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token (can also be sent as cookie)
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
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
 *                   example: 'Token refreshed successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'Invalid or expired token'
 */
router.post("/refresh-token", (0, validate_middleware_1.validate)(auth_schema_1.refreshTokenSchema), auth_controller_1.refreshToken);
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Revokes refresh token and clears authentication cookies
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: 'Logout successful'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'User not authenticated'
 */
router.post("/logout", auth_middleware_1.authenticate, auth_controller_1.logout);
/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset via email
 *     description: Generates a secure token and sends password reset email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (always returns success to prevent email enumeration)
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
 *                   example: 'If the email exists, a password reset link has been sent'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/forgot-password", rateLimit_middleware_1.passwordResetRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.forgotPasswordSchema), auth_controller_1.forgotPassword);
/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Validates token and updates user password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               token:
 *                 type: string
 *                 example: 'abc123def456...'
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: 'NewSecurePassword123!'
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: 'Password reset successful'
 *       400:
 *         description: Validation error or invalid/expired token
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
router.post("/reset-password", rateLimit_middleware_1.passwordResetRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.resetPasswordSchema), auth_controller_1.resetPassword);
/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change password
 *     description: Updates user password after verifying current password. Requires authentication.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: 'CurrentPassword123!'
 *                 description: Current password for verification
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: 'NewSecurePassword123!'
 *                 description: New password to set
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: 'Password changed successfully'
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error or invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: 'Invalid email or password'
 *       401:
 *         description: User not authenticated
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
router.put("/change-password", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(auth_schema_1.changePasswordSchema), auth_controller_1.changePassword);
/**
 * @swagger
 * /auth/accept-invitation:
 *   post:
 *     summary: Accept user invitation
 *     description: Validates invitation token, sets user password, verifies email, and marks invitation as used
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Invitation token received via email
 *                 example: 'abc123def456...'
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: New password for the user account
 *                 example: 'SecurePassword123!'
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
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
 *                   example: 'Invitation accepted successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           example: 'user@example.com'
 *                         name:
 *                           type: string
 *                           example: 'John Doe'
 *                         isVerified:
 *                           type: boolean
 *                           example: true
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Validation error or invalid/expired invitation token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'Invalid or expired invitation token'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /auth/verify-invitation:
 *   get:
 *     summary: Verify invitation token
 *     description: Validates invitation token and returns whether password is required (new user) or not (existing user)
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *     responses:
 *       200:
 *         description: Invitation verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Invitation verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requiresPassword:
 *                       type: boolean
 *                       example: false
 *                       description: Whether password is required (true for new users, false for existing users)
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     tenantName:
 *                       type: string
 *                       example: Acme Corp
 *       400:
 *         description: Invalid or expired invitation token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/verify-invitation", (0, validate_middleware_1.validate)(user_schema_1.verifyInvitationSchema, "query"), userInvitation_controller_1.verifyInvitation);
router.post("/accept-invitation", rateLimit_middleware_1.passwordResetRateLimiter, (0, validate_middleware_1.validate)(user_schema_1.acceptInvitationSchema), userInvitation_controller_1.acceptInvitation);
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user information
 *     description: Retrieves the current authenticated user's complete information including roles, permissions, and tenants. This is an alias for /auth/profile.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
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
 *                   example: 'User profile retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     name:
 *                       type: string
 *                       example: 'John Doe'
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                           example: 'superadmin'
 *                         displayName:
 *                           type: string
 *                           example: 'Super Admin'
 *                     permissions:
 *                       type: array
 *                       description: List of permissions assigned to the user
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *                     tenants:
 *                       type: array
 *                       description: List of tenants the user belongs to
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           isPrimary:
 *                             type: boolean
 *                     selectedTenantId:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: 'User not authenticated'
 */
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.getProfile);
/**
 * @swagger
 * /auth/mfa/enable:
 *   post:
 *     summary: Enable email-based MFA (Multi-Factor Authentication)
 *     description: Enables email OTP MFA for the authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email OTP MFA enabled successfully
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
 *                   example: 'Email OTP MFA enabled successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     mfaEnabled:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/mfa/enable", auth_middleware_1.authenticate, auth_controller_1.enableMfa);
/**
 * @swagger
 * /auth/mfa/disable:
 *   post:
 *     summary: Disable email-based MFA (Multi-Factor Authentication)
 *     description: Disables email OTP MFA for the authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email OTP MFA disabled successfully
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
 *                   example: 'Email OTP MFA disabled successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     mfaEnabled:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/mfa/disable", auth_middleware_1.authenticate, auth_controller_1.disableMfa);
/**
 * @swagger
 * /auth/mfa/status:
 *   get:
 *     summary: Get MFA status
 *     description: Retrieves the current MFA (Multi-Factor Authentication) status for the authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA status retrieved successfully
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
 *                   example: 'MFA status retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     mfaEnabled:
 *                       type: boolean
 *                       description: Whether MFA is enabled for the user
 *                       example: true
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/mfa/status", auth_middleware_1.authenticate, auth_controller_1.getMfaStatus);
/**
 * @swagger
 * /auth/mfa/verify:
 *   post:
 *     summary: Verify email OTP
 *     description: Verifies the email OTP code and completes login for users with email OTP MFA enabled
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: 6-digit OTP code sent via email
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: Email OTP verification successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error or MFA not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or expired OTP
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
router.post("/mfa/verify", rateLimit_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.mfaVerifySchema), auth_controller_1.verifyMfa);
/**
 * @swagger
 * /auth/totp/login:
 *   post:
 *     summary: Verify TOTP code for login
 *     description: Verifies TOTP code or backup code and completes login for users with TOTP enabled
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 description: 6-digit TOTP code or 8-character backup code
 *                 example: '123456'
 *               isBackupCode:
 *                 type: boolean
 *                 description: Whether the code is a backup code
 *                 default: false
 *     responses:
 *       200:
 *         description: TOTP verification successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error or TOTP not enabled
 *       401:
 *         description: Invalid TOTP code or backup code
 *       404:
 *         description: User not found
 */
router.post("/totp/login", rateLimit_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.totpLoginSchema), auth_controller_1.verifyTotp);
exports.default = router;
