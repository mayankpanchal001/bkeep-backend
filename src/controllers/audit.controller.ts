/**
 * Audit Log Controller
 * Handles HTTP requests for audit log operations
 */

import type { RequestHandler } from 'express'
import { Response } from 'express'
import type { z } from 'zod'

import type { JwtUser } from '@/types/jwt.type'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { ROLES } from '@constants/roles'
import { SUCCESS_MESSAGES } from '@constants/success'
import type { AuthenticatedRequest } from '@middlewares/auth.middleware'
import {
  findAuditLogById,
  findAuditLogs,
  findAuditLogsByActor,
  findAuditLogsByTarget,
} from '@queries/audit.queries'
import { auditLogListSchema } from '@schema/audit.schema'
import { getPaginationMetadata } from '@schema/shared.schema'
import { ApiError } from '@utils/ApiError'
import { ApiResponse } from '@utils/ApiResponse'
import asyncHandler from '@utils/asyncHandler'

/**
 * Get all audit logs controller
 * Retrieves audit logs with pagination, sorting, and filtering
 * SuperAdmin can see all logs, Admin can only see logs from their own tenant
 */
export const getAllAuditLogs: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated query parameters
    const validatedData = (
      req as AuthenticatedRequest & {
        validatedData: z.infer<typeof auditLogListSchema>
      }
    ).validatedData

    // Convert date strings to Date objects for query
    const filters: Parameters<typeof findAuditLogs>[0] = {
      page: validatedData.page,
      limit: validatedData.limit,
      sort: validatedData.sort,
      order: validatedData.order,
      ...(validatedData.action && { action: validatedData.action }),
      ...(validatedData.actorType && { actorType: validatedData.actorType }),
      ...(validatedData.actorId && { actorId: validatedData.actorId }),
      ...(validatedData.targetType && { targetType: validatedData.targetType }),
      ...(validatedData.targetId && { targetId: validatedData.targetId }),
      ...(validatedData.tenantId && { tenantId: validatedData.tenantId }),
      ...(validatedData.success !== undefined && {
        success: validatedData.success,
      }),
      ...(validatedData.startDate && {
        startDate: new Date(validatedData.startDate),
      }),
      ...(validatedData.endDate && {
        endDate: new Date(validatedData.endDate),
      }),
    }

    // If user is not SuperAdmin, restrict to their tenant
    const isSuperAdmin = user.role === ROLES.SUPERADMIN
    if (!isSuperAdmin && user.selectedTenantId) {
      filters.tenantId = user.selectedTenantId
    }

    // Fetch audit logs
    const { logs, total } = await findAuditLogs(filters)

    // Transform audit logs to response format
    const items = logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor,
      targets: log.targets,
      tenantId: log.tenantId,
      context: log.context,
      success: log.success,
      occurredAt: log.occurredAt,
      createdAt: log.createdAt,
    }))

    // Build response data
    const data = {
      items,
      pagination: getPaginationMetadata(
        filters.page ?? 1,
        filters.limit ?? 20,
        total
      ),
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.AUDIT_LOGS_RETRIEVED,
          data
        )
      )
  }
)

/**
 * Get audit log by ID controller
 * Retrieves a specific audit log by its ID
 */
export const getAuditLogById: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user as JwtUser

    // Get validated params
    const { id } = (
      req as AuthenticatedRequest & {
        params: { id: string }
      }
    ).params

    // Fetch audit log
    const auditLog = await findAuditLogById(id)

    if (!auditLog) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.AUDIT_LOG_NOT_FOUND
      )
    }

    // If user is not SuperAdmin, verify they have access to this tenant
    const isSuperAdmin = user.role === ROLES.SUPERADMIN
    if (!isSuperAdmin && user.selectedTenantId !== auditLog.tenantId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.ACCESS_DENIED)
    }

    // Transform audit log to response format
    const auditLogData = {
      id: auditLog.id,
      action: auditLog.action,
      actor: auditLog.actor,
      targets: auditLog.targets,
      tenantId: auditLog.tenantId,
      context: auditLog.context,
      success: auditLog.success,
      occurredAt: auditLog.occurredAt,
      createdAt: auditLog.createdAt,
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.AUDIT_LOG_RETRIEVED,
          auditLogData
        )
      )
  }
)

/**
 * Get audit logs by target entity controller
 * Retrieves audit logs for a specific target entity
 */
export const getAuditLogsByTarget: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get validated params
    const { targetType, targetId } = (
      req as AuthenticatedRequest & {
        params: { targetType: string; targetId: string }
      }
    ).params

    const limit = Number.parseInt((req.query['limit'] as string) ?? '50', 10)

    // Fetch audit logs
    const logs = await findAuditLogsByTarget(
      targetType,
      targetId,
      Math.min(limit, 100)
    )

    // Transform audit logs to response format
    const items = logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor,
      targets: log.targets,
      tenantId: log.tenantId,
      context: log.context,
      success: log.success,
      occurredAt: log.occurredAt,
      createdAt: log.createdAt,
    }))

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.AUDIT_LOGS_RETRIEVED, {
        items,
      })
    )
  }
)

/**
 * Get audit logs by actor controller
 * Retrieves audit logs for a specific actor
 */
export const getAuditLogsByActor: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get validated params
    const { actorType, actorId } = (
      req as AuthenticatedRequest & {
        params: { actorType: string; actorId: string }
      }
    ).params

    const limit = Number.parseInt((req.query['limit'] as string) ?? '50', 10)

    // Fetch audit logs
    const logs = await findAuditLogsByActor(
      actorType,
      actorId,
      Math.min(limit, 100)
    )

    // Transform audit logs to response format
    const items = logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor,
      targets: log.targets,
      tenantId: log.tenantId,
      context: log.context,
      success: log.success,
      occurredAt: log.occurredAt,
      createdAt: log.createdAt,
    }))

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.AUDIT_LOGS_RETRIEVED, {
        items,
      })
    )
  }
)
