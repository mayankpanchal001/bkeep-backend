/**
 * Validation Middleware
 * Validates request body, query, and params using Zod schemas
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodType } from 'zod'
import { z } from 'zod'

/**
 * Validation middleware factory
 * Creates a middleware that validates request data using a Zod schema
 * @param schema - Zod schema to validate against
 * @param source - Where to validate from: 'body', 'query', or 'params'
 * @returns Express middleware
 */
export const validate = <T extends ZodType>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      let data: unknown
      if (source === 'body') {
        data = req.body
      } else if (source === 'query') {
        data = req.query
      } else {
        data = req.params
      }
      const validatedData = schema.parse(data)

      // Attach validated data to request
      ;(req as Request & { validatedData: z.infer<T> }).validatedData =
        validatedData

      next()
    } catch (error) {
      next(error)
    }
  }
}
