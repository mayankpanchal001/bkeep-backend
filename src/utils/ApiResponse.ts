import { HTTP_STATUS } from '@constants/http'

/**
 * Standard API response wrapper class
 * Provides a consistent structure for API responses
 */
export class ApiResponse<T = unknown> {
  public readonly success: boolean
  public readonly statusCode: number
  public readonly message: string
  public readonly data: T | undefined

  constructor(statusCode: number, message: string, data: T | undefined) {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success =
      statusCode >= HTTP_STATUS.OK && statusCode < HTTP_STATUS.BAD_REQUEST
  }
}
