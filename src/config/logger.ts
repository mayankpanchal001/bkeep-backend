/**
 * Winston Logger Configuration
 *
 * Features:
 * - Daily rotating file logs with compression
 * - Separate HTTP request logging via Morgan integration
 * - Environment-based console formatting (dev vs prod)
 * - Error resilience with exitOnError: false
 * - Structured JSON logging with timestamps
 * - Multiple log levels with proper hierarchy
 *
 * Transports:
 * - Console: Colored output for development
 * - Application: Daily rotating files (14d retention)
 * - Error: Dedicated error logs (30d retention)
 * - HTTP: Request logs via Morgan (14d retention)
 */

import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

import { env, isDevelopment, isTest } from '@config/env'

/**
 * Log levels configuration
 * Lower numbers = higher priority
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const

/**
 * Log colors for console output
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'white',
  debug: 'cyan',
  silly: 'grey',
} as const

/**
 * Common file transport configuration
 */
const FILE_TRANSPORT_OPTIONS = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
} as const

// Register colors with winston
winston.addColors(LOG_COLORS)

/**
 * Base log format for file transports
 * Combines timestamp, error stack traces, and JSON formatting
 */
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info
    return JSON.stringify({
      level,
      message,
      ...meta,
      timestamp,
    })
  })
)

/**
 * Console format for development
 * Provides colored, human-readable output with timestamps and metadata
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: isDevelopment() }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: isDevelopment() }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info
    const metaString =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} ${level}: ${message}${metaString}`
  })
)

/**
 * Main application transports
 * Console for development, file rotation for production, separate error logs
 */
const mainTransports = [
  // Console transport for development
  new winston.transports.Console({
    format: consoleFormat,
    level: isDevelopment() ? 'debug' : 'info',
  }),

  // File transport for all logs
  new DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    maxFiles: '14d',
    level: env.LOG_LEVEL ?? 'info',
    format: baseFormat,
    ...FILE_TRANSPORT_OPTIONS,
  }),

  // File transport for warnings only
  new DailyRotateFile({
    filename: 'logs/warning-%DATE%.log',
    maxFiles: '14d',
    level: 'warn',
    format: baseFormat,
    ...FILE_TRANSPORT_OPTIONS,
  }),

  // File transport for errors only
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    maxFiles: '30d',
    level: 'error',
    format: baseFormat,
    ...FILE_TRANSPORT_OPTIONS,
  }),
]

/**
 * Main application logger
 * Handles all application logs with multiple transports and error resilience
 */
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  format: baseFormat,
  transports: mainTransports,
  exitOnError: false,
  silent: isTest(),
})

/**
 * Stream for Morgan HTTP logging
 * Integrates Winston logger with Morgan middleware for HTTP request logging
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(logger as any).stream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}

export default logger
