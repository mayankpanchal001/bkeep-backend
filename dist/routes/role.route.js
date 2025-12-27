"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roles_1 = require("../constants/roles");
const role_controller_1 = require("../controllers/role.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const role_schema_1 = require("../schema/role.schema");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Retrieve all roles
 *     description: Retrieves roles with pagination, sorting, search, and filtering.
 *     tags: [Roles]
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
 *           enum: [name, displayName, createdAt, updatedAt]
 *           default: displayName
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
 *         description: Search term to filter roles by name or display name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
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
 *                   example: 'Roles retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)({ roles: [roles_1.ROLES.SUPERADMIN, roles_1.ROLES.ADMIN] }), (0, validate_middleware_1.validate)(role_schema_1.roleListSchema, "query"), role_controller_1.getAllRoles);
/**
 * @swagger
 * /roles/statistics:
 *   get:
 *     summary: Retrieve role statistics and overview data
 *     description: Returns aggregated statistics about roles including counts, permissions data, and recent roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role statistics retrieved successfully
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
 *                   example: 'Role statistics retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/RoleStatistics'
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
router.get("/statistics", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)({ roles: [roles_1.ROLES.SUPERADMIN, roles_1.ROLES.ADMIN] }), role_controller_1.getRoleStatistics);
/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Retrieve a specific role by its ID
 *     description: Retrieves a single role by its ID.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID (UUID)
 *     responses:
 *       200:
 *         description: Role retrieved successfully
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
 *                   example: 'Role retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation error (invalid UUID format)
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
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)({ roles: [roles_1.ROLES.SUPERADMIN, roles_1.ROLES.ADMIN] }), (0, validate_middleware_1.validate)(role_schema_1.roleIdSchema, "params"), role_controller_1.getRoleById);
/**
 * @swagger
 * /roles/{id}/permissions:
 *   get:
 *     summary: Retrieve a specific role with permissions by its ID
 *     description: Retrieves a single role by its ID with its assigned permissions. Only active, non-deleted permissions are included.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID (UUID)
 *     responses:
 *       200:
 *         description: Role with permissions retrieved successfully
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
 *                   example: 'Role with permissions retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/RoleWithPermissions'
 *       400:
 *         description: Validation error (invalid UUID format)
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
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id/permissions", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)({ roles: [roles_1.ROLES.SUPERADMIN, roles_1.ROLES.ADMIN] }), (0, validate_middleware_1.validate)(role_schema_1.roleIdSchema, "params"), role_controller_1.getRoleWithPermissions);
/**
 * @swagger
 * /roles/{id}/permissions:
 *   put:
 *     summary: Update role permissions
 *     description: Updates permissions assigned to a role. Replaces all existing permissions with the provided permission IDs.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 description: Array of permission IDs to assign to the role (empty array removes all permissions)
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example:
 *                   - '123e4567-e89b-12d3-a456-426614174000'
 *                   - '123e4567-e89b-12d3-a456-426614174001'
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
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
 *                   example: 'Role permissions updated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/RoleWithPermissions'
 *       400:
 *         description: Validation error or invalid permission IDs
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
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id/permissions", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)({ roles: [roles_1.ROLES.SUPERADMIN] }), (0, validate_middleware_1.validate)(role_schema_1.roleIdSchema, "params"), (0, validate_middleware_1.validate)(role_schema_1.updateRolePermissionsSchema), role_controller_1.updateRolePermissionsController);
exports.default = router;
