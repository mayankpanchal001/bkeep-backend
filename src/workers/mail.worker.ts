/**
 * Mail Worker
 * Standalone worker process to handle email queue jobs
 */

import logger from '@config/logger'
import {
  initializeMailQueue,
  initializeQueueEvents,
  processMailQueue,
} from '@queues/mail.queue'
import { verifyMailConnection } from '@services/mail.service'

/**
 * Graceful shutdown handler
 */
let isShuttingDown = false

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  logger.info(`${signal} received, starting graceful shutdown...`)

  try {
    const { closeMailQueue } = await import('@queues/mail.queue')
    const { closeMailTransporter } = await import('@services/mail.service')

    // Close mail queue
    await closeMailQueue()

    // Close mail transporter
    closeMailTransporter()

    logger.info('Mail worker shut down gracefully')
    // eslint-disable-next-line node/no-process-exit
    process.exit(0)
  } catch (error) {
    logger.error('Error during graceful shutdown:', error)
    // eslint-disable-next-line node/no-process-exit
    process.exit(1)
  }
}

/**
 * Start mail worker
 */
async function startMailWorker(): Promise<void> {
  try {
    logger.info('Starting mail worker...')

    // Verify mail connection
    const isConnected = await verifyMailConnection()
    if (!isConnected) {
      logger.warn(
        'Mail connection verification failed, but worker will continue'
      )
    }

    // Initialize mail queue, events, and worker
    initializeMailQueue()
    initializeQueueEvents()
    processMailQueue()

    logger.info('Mail worker ready - listening for jobs')

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM')
    })
    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT')
    })

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in mail worker:', error)
      void gracefulShutdown('UNCAUGHT_EXCEPTION')
    })

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled rejection in mail worker:', {
        reason:
          reason instanceof Error
            ? {
                message: reason.message,
                stack: reason.stack,
                name: reason.name,
              }
            : reason,
      })
      void gracefulShutdown('UNHANDLED_REJECTION')
    })
  } catch (error) {
    logger.error('Failed to start mail worker:', error)
    throw error
  }
}

// Start the worker
void startMailWorker()
