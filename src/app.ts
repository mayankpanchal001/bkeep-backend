import path from 'node:path'

import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'

import { env, isProduction } from '@config/env'
import logger from '@config/logger'
import { swaggerSpec, swaggerUiOptions } from '@config/swagger'
import { errorHandler } from '@middlewares/errorHandler.middleware'
import helmetMiddleware from '@middlewares/helmet.middleware'
import { notFoundHandler } from '@middlewares/notFoundHandler.middleware'
import { generalRateLimiter } from '@middlewares/rateLimit.middleware'
import { requestId, userAgent } from '@middlewares/request.middleware'
import sessionMiddleware from '@middlewares/session.middleware'
import healthRoutes from '@routes/health.route'
import routes from '@routes/index'

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true)
    }

    const allowedOrigins = env.CORS_ORIGIN || []

    // If no origins configured, allow all (development fallback)
    if (allowedOrigins.length === 0) {
      return callback(null, true)
    }

    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    // Reject origin not in allowed list
    callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200, // Some browsers (Safari) require 200 status for OPTIONS requests
}

const REQUEST_LIMITS_OPTIONS = {
  urlencoded: { extended: false, limit: '50kb' },
  json: { limit: '50kb' },
} as const

const app: express.Application = express()

// Trust proxy - required when behind reverse proxy (nginx, Docker, load balancer)
// Trust only the first proxy (Docker network) to prevent IP spoofing
// This allows Express to correctly identify client IPs from X-Forwarded-For headers
app.set('trust proxy', 1)

app.disable('x-powered-by')
app.use(requestId)
app.use(userAgent)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(morgan('combined', { stream: (logger as any).stream }))
if (isProduction()) app.use(generalRateLimiter)
app.use(helmetMiddleware)
app.use(sessionMiddleware)
app.use(express.urlencoded(REQUEST_LIMITS_OPTIONS.urlencoded))
app.use(express.json(REQUEST_LIMITS_OPTIONS.json))
app.use(cookieParser())
app.use(cors(corsOptions))
app.use(express.static(path.join(__dirname, 'public')))
app.get('/api-docs/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json(swaggerSpec)
})
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
)

// Health check at root level (for load balancers, monitoring tools)
app.use('/', healthRoutes)

// API routes
app.use(env.API_PREFIX, routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
