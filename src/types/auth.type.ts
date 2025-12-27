/**
 * Auth Types
 * Type definitions for authentication-related data structures
 */

/**
 * Permission structure from role relations
 */
export interface RolePermission {
  id: string
  name: string
  displayName: string
  isActive: boolean
  deletedAt?: Date | null
}

/**
 * Permission data in login response
 */
export interface PermissionData {
  id: string
  name: string
  displayName: string
}

/**
 * Role structure with permissions
 */
export interface RoleWithPermissions {
  id: string
  name: string
  displayName: string
  permissions?: RolePermission[]
}

/**
 * Role data in login response
 */
export interface RoleData {
  id: string
  name: string
  displayName: string
}

/**
 * Tenant data in login response
 */
export interface TenantData {
  id: string
  name: string
  isPrimary: boolean
}

/**
 * User data in login response (excludes sensitive fields)
 */
export interface LoginUserData {
  id: string
  email: string
  name: string
  role: RoleData
  permissions: PermissionData[]
  tenants: TenantData[]
  selectedTenantId: string
}

/**
 * Login response data structure
 */
export interface LoginResponseData {
  accessToken: string
  refreshToken: string
  user: LoginUserData
}

/**
 * Refresh token response data structure
 */
export interface RefreshTokenResponseData {
  accessToken: string
  refreshToken: string
}

/**
 * Authorization options interface
 * Used for role and permission-based access control
 */
export interface AuthorizeOptions {
  /**
   * Array of role names that are allowed to access the resource
   * User must have at least one of these roles
   */
  roles?: string[]
  /**
   * Array of permission names that are required to access the resource
   * User must have at least one of these permissions
   */
  permissions?: string[]
  /**
   * If true, user must have ALL specified permissions (AND logic)
   * If false, user needs at least ONE permission (OR logic)
   * Default: false
   */
  requireAllPermissions?: boolean
  /**
   * If true, user must have both a matching role AND required permissions
   * If false, user needs either a matching role OR required permissions
   * Default: false
   */
  requireBoth?: boolean
}
