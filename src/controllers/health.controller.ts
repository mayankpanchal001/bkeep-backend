import { Request, Response } from 'express'

import type { HealthResponse } from '@/types/api.type'
import { env } from '@config/env'
import { HTTP_STATUS } from '@constants/http'
import db from '@database/connection'
import asyncHandler from '@utils/asyncHandler'

/**
 * Check database connection health
 * @returns Promise that resolves with health check result
 */
const checkDatabaseHealth = async (): Promise<{
  status: 'ok' | 'degraded' | 'down'
  responseTime?: number
  details?: string
}> => {
  const startTime = Date.now()

  try {
    // Simple query to check database connectivity
    // Don't destroy the connection - it's shared across the application
    // The connection pool will manage connections automatically
    await db.raw('SELECT 1')
    const responseTime = Date.now() - startTime

    return {
      status: 'ok',
      responseTime,
    }
  } catch (error) {
    // Don't destroy the connection even on error
    // The connection pool will handle reconnection automatically

    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      details:
        error instanceof Error ? error.message : 'Database connection failed',
    }
  }
}

const getHealth: (req: Request, res: Response, next: () => void) => void =
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

    // Check database health
    const dbHealth = await checkDatabaseHealth()

    // Determine overall health status
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok'
    if (dbHealth.status === 'down') {
      overallStatus = 'down'
    } else if (dbHealth.status === 'degraded') {
      overallStatus = 'degraded'
    }

    const responseTime = Date.now() - startTime

    const healthResponse: HealthResponse = {
      success: true,
      message:
        overallStatus === 'ok'
          ? 'Service is healthy'
          : overallStatus === 'degraded'
            ? 'Service is degraded'
            : 'Service is unhealthy',
      status: overallStatus,
      timestamp,
      services: {
        database: dbHealth,
      },
      version: '1.0.0',
      environment: env.NODE_ENV,
    }

    const statusCode =
      overallStatus === 'ok' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE

    res.status(statusCode).json({
      ...healthResponse,
      responseTime,
    })
  })

export { getHealth }
