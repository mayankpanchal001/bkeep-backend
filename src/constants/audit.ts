/**
 * Audit Constants
 * Action types and entity types for audit logging
 */

/**
 * Audit action constants
 * Uses namespaced string format (e.g., 'user.logged_in', 'tenant.created')
 */
export const AUDIT_ACTIONS = {
  // Tenant actions
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_DELETED: 'tenant.deleted',
  TENANT_RESTORED: 'tenant.restored',
  TENANT_SWITCHED: 'tenant.switched',
  // User actions
  USER_DELETED: 'user.deleted',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  // Account actions
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_UPDATED: 'account.updated',
  ACCOUNT_DELETED: 'account.deleted',
  ACCOUNT_RESTORED: 'account.restored',
  ACCOUNT_ACTIVATED: 'account.activated',
  ACCOUNT_DEACTIVATED: 'account.deactivated',
} as const

/**
 * Audit entity types
 */
export const AUDIT_ENTITY_TYPES = {
  USER: 'User',
  TENANT: 'Tenant',
  ROLE: 'Role',
  PERMISSION: 'Permission',
  ACCOUNT: 'Account',
  USER_INVITATION: 'UserInvitation',
  USER_TENANT: 'UserTenant',
  USER_ROLE: 'UserRole',
  ROLE_PERMISSION: 'RolePermission',
  PASSWORD_RESET: 'PasswordReset',
  MFA_EMAIL_OTP: 'MfaEmailOtp',
  USER_AUTHENTICATOR: 'UserAuthenticator',
} as const

/**
 * Type for audit action values
 * Uses namespaced string format (e.g., 'user.logged_in', 'tenant.created', 'account.updated')
 */
export type AuditAction = string

/**
 * Type for audit entity type values
 */
export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES]
