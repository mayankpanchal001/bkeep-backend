/**
 * Mail Queue
 * Manages email sending jobs using BullMQ
 */

import { Job, Queue, QueueEvents, Worker } from 'bullmq'

import { MailJobData, MailJobResult, MailOptions } from '@/types/mail.type'
import { env } from '@config/env'
import logger from '@config/logger'
import { bullMQConnection } from '@config/redis'
import {
  MAIL_JOB_NAMES,
  MAIL_QUEUE_NAME,
  MAIL_WORKER_CONCURRENCY,
} from '@constants/mail'
import { sendMail } from '@services/mail.service'

/**
 * Mail queue instance
 */
let mailQueue: Queue<MailJobData> | null = null

/**
 * Mail worker instance
 */
let mailWorker: Worker<MailJobData, MailJobResult> | null = null

/**
 * Queue events instance
 */
let queueEvents: QueueEvents | null = null

/**
 * Default job options
 */
const defaultJobOptions = {
  attempts: env.MAIL_QUEUE_ATTEMPTS,
  backoff: {
    type: 'exponential' as const,
    delay: env.MAIL_QUEUE_BACKOFF_DELAY,
  },
  removeOnComplete: true,
  removeOnFail: false,
}

/**
 * Initialize mail queue
 */
export function initializeMailQueue(): Queue<MailJobData> {
  if (mailQueue) {
    return mailQueue
  }

  mailQueue = new Queue<MailJobData>(MAIL_QUEUE_NAME, {
    connection: bullMQConnection,
    defaultJobOptions,
  })

  logger.info('Mail queue initialized')

  return mailQueue
}

/**
 * Initialize queue events
 */
export function initializeQueueEvents(): QueueEvents {
  if (queueEvents) {
    return queueEvents
  }

  queueEvents = new QueueEvents(MAIL_QUEUE_NAME, {
    connection: bullMQConnection,
  })

  // Queue event listeners
  queueEvents.on('waiting', ({ jobId }) => {
    logger.debug(`Mail job ${jobId} is waiting`)
  })

  queueEvents.on('active', ({ jobId }) => {
    logger.debug(`Mail job ${jobId} started processing`)
  })

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    const result = returnvalue as unknown as MailJobResult
    logger.info(`Mail job ${jobId} completed`, {
      jobId,
      success: result?.success,
      messageId: result?.messageId,
    })
  })

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Mail job ${jobId} failed:`, {
      jobId,
      error: failedReason,
    })
  })

  queueEvents.on('stalled', ({ jobId }) => {
    logger.warn(`Mail job ${jobId} stalled`)
  })

  logger.info('Mail queue events initialized')

  return queueEvents
}

/**
 * Get mail queue instance
 */
export function getMailQueue(): Queue<MailJobData> {
  if (!mailQueue) {
    return initializeMailQueue()
  }
  return mailQueue
}

/**
 * Process mail jobs (initialize worker)
 */
export function processMailQueue(): Worker<MailJobData, MailJobResult> {
  if (mailWorker) {
    return mailWorker
  }

  mailWorker = new Worker<MailJobData, MailJobResult>(
    MAIL_QUEUE_NAME,
    async (job: Job<MailJobData>) => {
      logger.info(`Processing mail job ${job.id}`, {
        jobId: job.id,
        to: job.data.to,
        template: job.data.template,
        attemptsMade: job.attemptsMade,
      })

      try {
        const result = await sendMail(job.data)

        if (!result.success) {
          throw new Error(result.error ?? 'Failed to send email')
        }

        return result
      } catch (error) {
        logger.error(`Mail job ${job.id} processing error:`, error)
        throw error
      }
    },
    {
      connection: bullMQConnection,
      concurrency: MAIL_WORKER_CONCURRENCY,
    }
  )

  // Worker event listeners
  mailWorker.on('completed', (job) => {
    logger.debug(`Worker completed job ${job.id}`)
  })

  mailWorker.on('failed', (job, error) => {
    if (job) {
      logger.error(`Worker failed job ${job.id}:`, {
        jobId: job.id,
        error: error.message,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      })
    }
  })

  mailWorker.on('error', (error) => {
    logger.error('Mail worker error:', error)
  })

  logger.info(
    `BullMQ worker initialized (concurrency: ${MAIL_WORKER_CONCURRENCY})`
  )

  return mailWorker
}

/**
 * Add mail job to queue
 */
export async function addMailJob(
  mailOptions: MailOptions,
  options?: Partial<typeof defaultJobOptions>
): Promise<Job<MailJobData> | null> {
  if (!env.MAIL_QUEUE_ENABLED) {
    // If queue is disabled, send email directly
    logger.info('Mail queue disabled, sending email directly')
    await sendMail(mailOptions)
    return null
  }

  const queue = getMailQueue()

  const job = await queue.add(MAIL_JOB_NAMES.SEND_MAIL, mailOptions, {
    ...defaultJobOptions,
    ...options,
  })

  logger.info(`Mail job ${job.id} added to queue`, {
    jobId: job.id,
    to: mailOptions.to,
    template: mailOptions.template,
  })

  return job
}

/**
 * Get mail queue statistics
 */
export async function getMailQueueStats(): Promise<{
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}> {
  const queue = getMailQueue()

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])

  return { waiting, active, completed, failed, delayed }
}

/**
 * Close mail queue and worker
 */
export async function closeMailQueue(): Promise<void> {
  const promises: Promise<void>[] = []

  if (mailWorker) {
    promises.push(mailWorker.close())
    mailWorker = null
  }

  if (queueEvents) {
    promises.push(queueEvents.close())
    queueEvents = null
  }

  if (mailQueue) {
    promises.push(mailQueue.close())
    mailQueue = null
  }

  await Promise.all(promises)
  logger.info('Mail queue closed')
}
