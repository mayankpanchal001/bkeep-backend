/**
 * Tenant Types
 * Type definitions for tenant-related data structures
 */

import type { Tenant } from '@models/Tenant'

/**
 * Tenant list item data
 */
export interface TenantListItem {
  id: string
  name: string
  isActive: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Tenant list data with pagination
 */
export interface TenantListData {
  items: TenantListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Tenant detail data
 */
export interface TenantDetailData extends Tenant {
  users?: Array<{
    id: string
    name: string
    email: string
    isVerified: boolean
    isPrimary: boolean
  }>
}
