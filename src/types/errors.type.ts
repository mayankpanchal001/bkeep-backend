/**
 * Error Types
 * Centralized error type definitions for the application
 */

export interface BaseError {
  message: string
  statusCode: number
  isOperational: boolean
  stack?: string
}
