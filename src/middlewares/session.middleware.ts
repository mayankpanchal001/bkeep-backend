/**
 * Session middleware configuration
 *
 * Features:
 * - Session store using Knex.js
 * - Session secret management
 * - Session cookie configuration
 * - Session cleanup interval
 */
import { ConnectSessionKnexStore } from 'connect-session-knex'
import type { RequestHandler } from 'express'
import session from 'express-session'

import { env, isProduction } from '@config/env'
import { SECURITY_RULES } from '@constants/index'
import db from '@database/connection'

const store = new ConnectSessionKnexStore({
  knex: db,
  tableName: 'sessions',
  createTable: true,
  sidFieldName: 'sid',
  cleanupInterval: 15 * 60 * 1000,
})

const sessionMiddleware: RequestHandler = session({
  name: SECURITY_RULES.SESSION_NAME,
  secret: env.SESSION_SECRET,
  resave: false,
  rolling: true,
  saveUninitialized: false,
  cookie: {
    maxAge: SECURITY_RULES.SESSION_MAX_AGE,
    secure: isProduction(),
    httpOnly: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
  },
  store,
})

export default sessionMiddleware
