import jwt from 'jsonwebtoken'

import type { JwtUser, TokenPayload } from '@/types/jwt.type'
import { env } from '@config/env'
import { HTTP_STATUS } from '@constants/http'
import { ApiError } from '@utils/ApiError'

/**
 * Sign access token
 * @param user - User data to encode in token
 * @returns Access token string
 */
export const signAccessToken = (user: JwtUser): string => {
  return jwt.sign({ user }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  } as jwt.SignOptions)
}

/**
 * Sign refresh token
 * @param user - User data to encode in token (only id is needed)
 * @returns Refresh token string
 */
export const signRefreshToken = (user: { id: string }): string => {
  return jwt.sign({ user: { id: user.id } }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
  } as jwt.SignOptions)
}

/**
 * Sign both access and refresh tokens
 * @param user - User data to encode in tokens
 * @returns Object containing accessToken and refreshToken
 */
export const signTokens = (
  user: JwtUser
): { accessToken: string; refreshToken: string } => {
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)
  return { accessToken, refreshToken }
}

/**
 * Verify JWT token
 * @param token - Token to verify
 * @param secret - Secret key to verify against
 * @returns Decoded token payload
 */
export const verifyToken = async (
  token: string,
  secret: string
): Promise<TokenPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (error, decoded) => {
      if (error) {
        reject(
          new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            `Token verification failed: ${error.message}`
          )
        )
      } else {
        resolve(decoded as TokenPayload)
      }
    })
  })
}

/**
 * Verify access token
 * @param token - Refresh token to verify
 * @returns User ID from token
 */
export const verifyAccessToken = async (token: string): Promise<JwtUser> => {
  const decoded = await verifyToken(token, env.ACCESS_TOKEN_SECRET)
  return decoded.user
}

/**
 * Verify refresh token
 * @param token - Refresh token to verify
 * @returns User ID from token
 */
export const verifyRefreshToken = async (
  token: string
): Promise<{ id: string }> => {
  const decoded = await verifyToken(token, env.REFRESH_TOKEN_SECRET)
  return decoded.user
}
