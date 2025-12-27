/**
 * User Types
 * Type definitions for user-related data structures
 */

import type { PermissionData, RoleData } from '@/types/auth.type'

/**
 * User list item data
 * User data returned in list endpoints (excludes sensitive fields)
 */
export interface UserListItem {
  id: string
  email: string
  name: string
  isVerified: boolean
  verifiedAt: Date | null
  isActive: boolean
  mfaEnabled: boolean
  lastLoggedInAt: Date | null
  createdAt: Date
  updatedAt: Date
  role: RoleData
  permissions: PermissionData[]
}

/**
 * User list response data
 * Paginated user list with metadata
 */
export interface UserListData {
  items: UserListItem[]
  pagination: {
    page: number
    limit: number
    offset: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
