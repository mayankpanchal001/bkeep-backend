/**
 * JWT User payload interface
 */
export interface JwtUser {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
  selectedTenantId: string
}

/**
 * Token payload interface
 */
export interface TokenPayload {
  user: JwtUser
  iat?: number
  exp?: number
}
