/**
 * UserRole Type Definitions
 * Types for user-role-tenant relationships
 */

/**
 * User Role Data - what's stored in the database
 */
export interface UserRoleData {
  userId: string
  roleId: string
  tenantId: string
  createdAt: Date
}

/**
 * User Role with Role Details
 */
export interface UserRoleWithRole extends UserRoleData {
  role: {
    id: string
    name: string
    displayName: string
    description?: string | null
    isActive: boolean
  }
}

/**
 * User Role with User Details
 */
export interface UserRoleWithUser extends UserRoleData {
  user: {
    id: string
    name: string
    email: string
    isActive: boolean
  }
}

/**
 * User Role with Full Details
 */
export interface UserRoleWithDetails extends UserRoleData {
  user: {
    id: string
    name: string
    email: string
    isActive: boolean
  }
  role: {
    id: string
    name: string
    displayName: string
    description?: string | null
    isActive: boolean
  }
  tenant: {
    id: string
    name: string
    schemaName: string
    isActive: boolean
  }
}

/**
 * Input for assigning a role to a user
 */
export interface AssignRoleInput {
  userId: string
  roleId: string
  tenantId: string
}

/**
 * Input for removing a role from a user
 */
export interface RemoveRoleInput {
  userId: string
  roleId: string
  tenantId: string
}

/**
 * Input for syncing user roles in a tenant
 */
export interface SyncUserRolesInput {
  userId: string
  tenantId: string
  roleIds: string[]
}

/**
 * User Role Query Result
 */
export interface UserRoleQueryResult {
  userRoles: UserRoleWithDetails[]
  total: number
}

/**
 * User's Roles Grouped by Tenant
 */
export interface UserRolesByTenant {
  [tenantId: string]: {
    tenantId: string
    tenantName: string
    schemaName: string
    roles: Array<{
      roleId: string
      roleName: string
      roleDisplayName: string
      assignedAt: Date
    }>
  }
}

/**
 * Permission Data in User-Tenant-Role-Permission Relationship
 */
export interface PermissionInRelationship {
  id: string
  name: string
  displayName: string
  description: string | null
}

/**
 * Role Data in User-Tenant-Role-Permission Relationship
 */
export interface RoleInRelationship {
  id: string
  name: string
  displayName: string
  assignedAt: Date
  permissions: PermissionInRelationship[]
}

/**
 * Complete User-Tenant-Role-Permission Relationship
 * This represents the full chain: User → Tenant → Roles → Permissions
 */
export interface UserTenantRolePermissions {
  userId: string
  userName: string
  userEmail: string
  tenantId: string
  tenantName: string
  roles: RoleInRelationship[]
  permissions: PermissionInRelationship[]
  permissionNames: string[]
}
