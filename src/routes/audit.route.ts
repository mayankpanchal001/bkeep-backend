import { Router, type Router as RouterType } from 'express'

import { ROLES } from '@constants/roles'
import {
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByActor,
  getAuditLogsByTarget,
} from '@controllers/audit.controller'
import { authenticate, authorize } from '@middlewares/auth.middleware'
import { validate } from '@middlewares/validate.middleware'
import { auditLogIdSchema, auditLogListSchema } from '@schema/audit.schema'

const router: RouterType = Router()

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Retrieve all audit logs
 *     description: Retrieves audit logs with pagination, sorting, and filtering. SuperAdmin can see all logs, Admin can only see logs from their own tenant.
 *     tags: [Audit Logs]
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
 *           enum: [occurredAt, createdAt, action]
 *           default: occurredAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: |
 *           Filter by action type (namespaced format, e.g., "user.logged_in", "tenant.created").
 *           Common actions: tenant.*, user.*, account.*
 *       - in: query
 *         name: actorType
 *         schema:
 *           type: string
 *           enum: [user, system, api_key]
 *         description: Filter by actor type
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by actor ID
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: Filter by target entity type
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by target entity ID
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by tenant ID
 *       - in: query
 *         name: success
 *         schema:
 *           type: boolean
 *         description: Filter by success status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date (ISO 8601)
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
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
 *                   example: 'Audit logs retrieved successfully'
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AuditLog'
 *                       required:
 *                         - items
 *                         - pagination
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: 'Audit logs retrieved successfully'
 *               data:
 *                 items:
 *                   - id: '123e4567-e89b-12d3-a456-426614174000'
 *                     action: 'user.logged_in'
 *                     actor:
 *                       type: 'user'
 *                       id: 'user_01GBNJC3MX9ZZJW1FSTF4C5938'
 *                       email: 'user@example.com'
 *                       name: 'John Doe'
 *                     targets:
 *                       - type: 'Tenant'
 *                         id: '123e4567-e89b-12d3-a456-426614174001'
 *                     tenantId: '123e4567-e89b-12d3-a456-426614174001'
 *                     context:
 *                       location: '123.123.123.123'
 *                       userAgent: 'Chrome/104.0.0.0'
 *                       method: 'POST'
 *                       endpoint: '/api/v1/auth/login'
 *                     success: true
 *                     occurredAt: '2025-01-15T10:30:00.000Z'
 *                     createdAt: '2025-01-15T10:30:00.000Z'
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                   offset: 0
 *                   total: 1
 *                   totalPages: 1
 *                   hasNextPage: false
 *                   hasPreviousPage: false
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
router.get(
  '/',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(auditLogListSchema, 'query'),
  getAllAuditLogs
)

/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Retrieve a specific audit log by ID
 *     description: Retrieves a specific audit log by its ID
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Audit log ID
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
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
 *                   example: 'Audit log retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/AuditLog'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: 'Audit log retrieved successfully'
 *               data:
 *                 id: '123e4567-e89b-12d3-a456-426614174000'
 *                 action: 'user.logged_in'
 *                 actor:
 *                   type: 'user'
 *                   id: 'user_01GBNJC3MX9ZZJW1FSTF4C5938'
 *                   email: 'user@example.com'
 *                   name: 'John Doe'
 *                 targets:
 *                   - type: 'Tenant'
 *                     id: '123e4567-e89b-12d3-a456-426614174001'
 *                 tenantId: '123e4567-e89b-12d3-a456-426614174001'
 *                 context:
 *                   location: '123.123.123.123'
 *                   userAgent: 'Chrome/104.0.0.0'
 *                   method: 'POST'
 *                   endpoint: '/api/v1/auth/login'
 *                 success: true
 *                 occurredAt: '2025-01-15T10:30:00.000Z'
 *                 createdAt: '2025-01-15T10:30:00.000Z'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Audit log not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:id',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  validate(auditLogIdSchema, 'params'),
  getAuditLogById
)

/**
 * @swagger
 * /audit-logs/target/{targetType}/{targetId}:
 *   get:
 *     summary: Retrieve audit logs for a specific target entity
 *     description: Retrieves audit logs for a specific target entity (e.g., User, Account)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *         description: Target entity type (e.g., User, Account)
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Target entity ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of logs to return
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
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
 *                   example: 'Audit logs retrieved successfully'
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AuditLog'
 *                       required:
 *                         - items
 *                         - pagination
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: 'Audit logs retrieved successfully'
 *               data:
 *                 items:
 *                   - id: '123e4567-e89b-12d3-a456-426614174000'
 *                     action: 'user.activated'
 *                     actor:
 *                       type: 'user'
 *                       id: 'user_01GBNJC3MX9ZZJW1FSTF4C5938'
 *                     targets:
 *                       - type: 'User'
 *                         id: 'user_01GBNJD4MKHVKJGEWK42JNMBGS'
 *                     tenantId: '123e4567-e89b-12d3-a456-426614174001'
 *                     context:
 *                       location: '123.123.123.123'
 *                       userAgent: 'Chrome/104.0.0.0'
 *                     success: true
 *                     occurredAt: '2025-01-15T10:30:00.000Z'
 *                     createdAt: '2025-01-15T10:30:00.000Z'
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
router.get(
  '/target/:targetType/:targetId',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  getAuditLogsByTarget
)

/**
 * @swagger
 * /audit-logs/actor/{actorType}/{actorId}:
 *   get:
 *     summary: Retrieve audit logs for a specific actor
 *     description: Retrieves audit logs for a specific actor (user, system, api_key)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actorType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user, system, api_key]
 *         description: Actor type
 *       - in: path
 *         name: actorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Actor ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of logs to return
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
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
 *                   example: 'Audit logs retrieved successfully'
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AuditLog'
 *                       required:
 *                         - items
 *                         - pagination
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: 'Audit logs retrieved successfully'
 *               data:
 *                 items:
 *                   - id: '123e4567-e89b-12d3-a456-426614174000'
 *                     action: 'user.logged_in'
 *                     actor:
 *                       type: 'user'
 *                       id: 'user_01GBNJC3MX9ZZJW1FSTF4C5938'
 *                     targets:
 *                       - type: 'Tenant'
 *                         id: '123e4567-e89b-12d3-a456-426614174001'
 *                     tenantId: '123e4567-e89b-12d3-a456-426614174001'
 *                     context:
 *                       location: '123.123.123.123'
 *                       userAgent: 'Chrome/104.0.0.0'
 *                     success: true
 *                     occurredAt: '2025-01-15T10:30:00.000Z'
 *                     createdAt: '2025-01-15T10:30:00.000Z'
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
router.get(
  '/actor/:actorType/:actorId',
  authenticate,
  authorize({ roles: [ROLES.SUPERADMIN, ROLES.ADMIN] }),
  getAuditLogsByActor
)

export default router
