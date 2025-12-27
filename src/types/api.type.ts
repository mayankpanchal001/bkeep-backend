/**
 * API Response Types
 * Standardized response interfaces for consistent API responses
 */

export interface BaseResponse {
  success: boolean
  message: string
}

export interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true
  data?: T
}

export interface ValidationFieldError {
  field: string
  message: string
}

export interface ErrorResponse extends BaseResponse {
  success: false
  statusCode: number
  errors?: ValidationFieldError[]
  stack?: string
  data?: null
}

export interface HealthCheck {
  status: 'ok' | 'degraded' | 'down'
  responseTime?: number
  details?: string
}

export interface HealthResponse extends BaseResponse {
  success: true
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  services?: Record<string, HealthCheck>
  version: string
  environment: string
}
