import { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Higher-order function that wraps async Express route handlers
 * to automatically catch and forward errors to the error handling middleware
 *
 * @param fn - Async function that handles the route logic
 * @returns Express RequestHandler that can be used as middleware
 */
const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

export default asyncHandler
