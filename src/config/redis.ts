/**
 * Redis configuration
 */

import Redis from 'ioredis'

import { env } from '@config/env'
import logger from '@config/logger'

/**
 * Redis TLS configuration
 */
const getTlsConfig = () => {
  if (!env.REDIS_SSL) {
    return {}
  }

  return {
    tls: {
      rejectUnauthorized: false,
    },
  }
}

/**
 * Redis connection configuration
 */
export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DB,
  ...(env.REDIS_USERNAME ? { username: env.REDIS_USERNAME } : {}),
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  ...getTlsConfig(),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  enableReadyCheck: true,
  lazyConnect: false,
}

/**
 * BullMQ connection options
 */
export const bullMQConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_USERNAME ? { username: env.REDIS_USERNAME } : {}),
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  db: env.REDIS_DB,
  ...getTlsConfig(),
  maxRetriesPerRequest: null,
}

/**
 * Create and connect Redis client
 */
export function createRedisClient(): Redis {
  const client = new Redis(redisConfig)

  client.on('connect', () => {
    logger.info('Redis client connecting...')
  })

  client.on('ready', () => {
    logger.info('Redis client ready and connected')
  })

  client.on('error', (error) => {
    logger.error('Redis client error:', error)
  })

  client.on('close', () => {
    logger.info('Redis client connection closed')
  })

  client.on('reconnecting', () => {
    logger.warn('Redis client reconnecting...')
  })

  return client
}
