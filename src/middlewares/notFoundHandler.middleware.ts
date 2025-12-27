/**
 * Not Found Middleware
 * Catches all unmatched routes and throws NotFoundError
 */

import type { NextFunction, Request, Response } from 'express'

import { HTTP_STATUS } from '@constants/http'
import { ApiError } from '@utils/ApiError'

/**
 * Catch-all middleware for unmatched routes
 * Must be placed after all other routes
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(
    new ApiError(
      HTTP_STATUS.NOT_FOUND,
      `Route ${req.originalUrl} not found`,
      false
    )
  )
}
