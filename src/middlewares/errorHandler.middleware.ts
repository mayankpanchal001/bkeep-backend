/**
 * Global Error Handler Middleware
 * Centralized error handling for all application errors
 */

import type { ErrorRequestHandler, Request, Response } from 'express'
import { ZodError } from 'zod'

import type { ErrorResponse, ValidationFieldError } from '@/types/api.type'
import type { BaseError } from '@/types/errors.type'
import { isDevelopment, isProduction } from '@config/env'
import logger from '@config/logger'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'

/**
 * Global error handler middleware
 * Handles all errors and returns normalized JSON responses
 */
export const errorHandler: ErrorRequestHandler = (
  error: BaseError,
  req: Request,
  res: Response,
  _next
): void => {
  let { statusCode, message } = error

  // Default values for unknown errors
  if (!statusCode) {
    statusCode = 500
  }

  // Handle validation errors
  if (error instanceof ZodError) {
    statusCode = HTTP_STATUS.BAD_REQUEST
    const validationErrors: ValidationFieldError[] = error.issues.map(
      (issue) => {
        const field = issue.path.join('.') || 'unknown'
        return {
          field,
          message: issue.message,
        }
      }
    )

    // Log validation errors
    logger.error({
      message: validationErrors
        .map((err) => `${err.field}: ${err.message}`)
        .join(', '),
      statusCode,
      url: req.originalUrl,
      method: req.method,
      errors: validationErrors,
      ip: req.ip,
      requestId: (req as Request & { requestId?: string }).requestId,
      userAgent: req.headers['user-agent'],
    })

    const validationErrorResponse: ErrorResponse = {
      success: false,
      statusCode,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      errors: validationErrors,
      data: null,
    }

    res.status(statusCode).json(validationErrorResponse)
    return
  }

  // Log global errors
  logger.error({
    message,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    ...(isDevelopment() && { stack: error.stack }),
    ip: req.ip,
    requestId: (req as Request & { requestId?: string }).requestId,
    userAgent: req.headers['user-agent'],
  })

  // For production environment, hide error stack traces
  if (isProduction() && !error.isOperational) {
    message = 'An unexpected error occurred'
  }

  const errorResponse: ErrorResponse = {
    success: false,
    statusCode,
    message,
    ...(isDevelopment() && { stack: error.stack }),
    data: null,
  }

  res.status(statusCode).json(errorResponse)
}
