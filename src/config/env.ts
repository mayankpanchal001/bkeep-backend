import { existsSync } from 'node:fs'
import { join } from 'node:path'

import dotenv from 'dotenv'
import { z } from 'zod'

const envPath = join(__dirname, '..', '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * Environment schema validation
 */
const envSchema = z.object({
  API_PREFIX: z.string().default('/api/v1'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return []
      // Support comma-separated or space-separated origins
      // Remove trailing slashes and trim whitespace
      return val
        .split(/[\s,]+/)
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    })
    .pipe(z.array(z.string().url())),
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z
    .string()
    .default('8000')
    .transform(Number)
    .pipe(z.number().min(1).max(65535)),
  HOST: z.string().default('localhost'),
  SHUTDOWN_TIMEOUT_MS: z
    .string()
    .default('10000')
    .transform(Number)
    .pipe(z.number().min(1000).max(60000)),

  // Database configuration
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z
    .string()
    .default('5432')
    .transform(Number)
    .pipe(z.number().min(1).max(65535)),
  DB_NAME: z.string().default('myapp_test'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // JWT configuration
  ACCESS_TOKEN_SECRET: z.string().default('access-token-secret'),
  ACCESS_TOKEN_EXPIRY: z.string().default('1h'),
  REFRESH_TOKEN_SECRET: z.string().default('refresh-token-secret'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  SESSION_SECRET: z.string().default('session-secret'),

  // Client configuration
  FRONTEND_URL: z.string().url().default('https://app.bkeep.ca'),

  // WebAuthn configuration
  WEBAUTHN_RP_ID: z.string().optional(),

  // Email configuration
  EMAIL_FROM: z.string().email().default('info@bkeep.ca').optional(),
  EMAIL_FROM_NAME: z.string().default('BKeep').optional(),

  // AWS SES configuration
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Redis configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .default('6379')
    .transform(Number)
    .pipe(z.number().min(1).max(65535)),
  REDIS_USERNAME: z
    .string()
    .optional()
    .transform((val) => val ?? undefined),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((val) => val ?? undefined),
  REDIS_DB: z
    .string()
    .default('0')
    .transform(Number)
    .pipe(z.number().min(0).max(15)),
  REDIS_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Mail Queue configuration
  MAIL_QUEUE_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  MAIL_QUEUE_ATTEMPTS: z
    .string()
    .default('3')
    .transform(Number)
    .pipe(z.number().min(1).max(10)),
  MAIL_QUEUE_BACKOFF_DELAY: z
    .string()
    .default('5000')
    .transform(Number)
    .pipe(z.number().min(1000)),
})

/**
 * Parse and validate environment variables
 */
const parseEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      )
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}`
      )
    }
    throw error
  }
}

/**
 * Validated environment configuration
 */
export const env = parseEnv()

/**
 * Type-safe environment configuration
 */
export type Env = z.infer<typeof envSchema>

/**
 * Check if running in development, production, or test mode
 */
export const isDevelopment = (): boolean => env.NODE_ENV === 'development'
export const isProduction = (): boolean => env.NODE_ENV === 'production'
export const isTest = (): boolean => env.NODE_ENV === 'test'
