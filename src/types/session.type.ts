/**
 * Session Types
 * Type definitions for session-related data structures
 */
import type { Session } from 'express-session'

import type { JwtUser } from './jwt.type'

/**
 * Session user interface
 * Session stores the same data as JWT (server-side only)
 */
export type SessionUser = JwtUser

/**
 * Extended session interface with user data
 * Extends express-session's Session to include user information
 */
export interface ExtendedSession extends Session {
  user?: SessionUser
}
