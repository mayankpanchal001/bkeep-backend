/**
 * Error Messages
 * Standardized error messages used across the application
 */
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  ROLE_NOT_FOUND: 'Role not found',
  ROLE_ID_REQUIRED: 'Role ID is required',
  ROLE_ID_INVALID: 'Role ID is invalid, inactive, or deleted',
  ROLE_ALREADY_EXISTS: 'Role with this name already exists',
  CANNOT_ASSIGN_SUPERADMIN_ROLE: 'SuperAdmin role cannot be assigned',
  USER_NO_ROLE: 'User has no assigned role',
  USER_NO_TENANT: 'User has no assigned tenant',
  TENANT_NOT_FOUND: 'Tenant not found',
  TENANT_NOT_FOUND_OR_NOT_DELETED: 'Tenant not found or not deleted',
  TENANT_SCHEMA_ALREADY_EXISTS: 'Tenant schema already exists',
  TENANT_SCHEMA_NOT_FOUND: 'Tenant schema does not exist',
  INVALID_TENANT_SCHEMA_NAME: 'Invalid tenant schema name format',
  TENANT_CONTEXT_REQUIRED: 'Tenant context required',
  ADMIN_ROLE_NOT_FOUND: 'Admin role not found',
  INVITATION_ALREADY_EXISTS:
    'An active invitation already exists for this user and tenant',
  ADMIN_CAN_ONLY_INVITE_OWN_TENANT:
    'Admin users can only invite users for their own tenant',
  TENANT_ID_REQUIRED_FOR_INVITATION:
    'Tenant ID is required for user invitation',
  INVITATION_TOKEN_REQUIRED: 'Invitation token is required',
  INVALID_INVITATION_TOKEN: 'Invalid or expired invitation token',
  INVITATION_NOT_FOUND: 'Invitation not found',
  INVITATION_ALREADY_REVOKED: 'Invitation has already been revoked',
  INVITATION_PASSWORD_REQUIRED_NEW_USER:
    'Password is required for new user registration',
  INVITATION_PASSWORD_NOT_ALLOWED_EXISTING_USER:
    'Password should not be provided for existing users',
  CANNOT_DELETE_SUPERADMIN: 'This user cannot be deleted',
  CANNOT_DEACTIVATE_SUPERADMIN: 'This user account cannot be deactivated',
  ACCOUNT_DEACTIVATED:
    'Your account has been deactivated. Please contact support.',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_RESET_TOKEN: 'Invalid or expired reset token',
  TOKEN_REQUIRED: 'Access token is required',
  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  USER_NOT_AUTHENTICATED: 'User not authenticated',
  UNAUTHORIZED_ACCESS: 'You do not have permission to access this resource',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  ROUTE_NOT_FOUND: 'Route not found',
  TOO_MANY_REQUESTS: 'Too many requests from this IP, please try again later.',
  TOO_MANY_AUTH_ATTEMPTS:
    'Too many authentication attempts, please try again later.',
  TOO_MANY_PASSWORD_RESET_ATTEMPTS:
    'Too many password reset attempts, please try again later.',
  TOO_MANY_OAUTH_ATTEMPTS: 'Too many OAuth attempts, please try again later.',
  AUDIT_LOG_NOT_FOUND: 'Audit log not found',
  ACCESS_DENIED: 'Access denied',
  MFA_OTP_INVALID_OR_EXPIRED: 'Invalid or expired verification code',
  MFA_OTP_GENERATION_FAILED:
    'Failed to generate verification code. Please try again.',
  MFA_NOT_ENABLED: 'MFA is not enabled for this account',
  MFA_SESSION_NOT_FOUND: 'No pending verification found. Please log in again.',
  MFA_TOTP_INVALID: 'Invalid authenticator code',
  MFA_TOTP_ALREADY_ENABLED: 'TOTP authenticator is already enabled',
  MFA_TOTP_NOT_ENABLED: 'TOTP authenticator is not enabled',
  MFA_TOTP_SETUP_REQUIRED: 'TOTP setup required before enabling',
  MFA_BACKUP_CODE_INVALID: 'Invalid backup code',
  MFA_BACKUP_CODES_NOT_AVAILABLE: 'Backup codes are not available',
  MFA_TYPE_MISMATCH:
    'MFA type mismatch. Please use the correct verification method.',
  ACCOUNT_NOT_FOUND: 'Account not found',
  ACCOUNT_NOT_FOUND_OR_NOT_DELETED: 'Account not found or not deleted',
  USER_NOT_MEMBER_OF_TENANT: 'User is not a member of this tenant',
  INVALID_ROLE_IDS: 'One or more role IDs are invalid, inactive, or deleted',
  PASSKEY_NOT_FOUND: 'Passkey not found',
  PASSKEY_CREATION_FAILED: 'Failed to create passkey. Please try again.',
  PASSKEY_REGISTRATION_FAILED: 'Passkey registration failed',
  PASSKEY_AUTHENTICATION_FAILED: 'Passkey authentication failed',
  PASSKEY_VERIFICATION_FAILED: 'Failed to verify passkey',
  PASSKEY_ALREADY_REGISTERED: 'This passkey is already registered',
  PASSKEY_CHALLENGE_EXPIRED: 'Passkey challenge expired. Please try again.',
  PASSKEY_CHALLENGE_INVALID: 'Invalid passkey challenge',
  PASSKEY_INVALID_CREDENTIAL: 'Invalid passkey credential',
  PASSKEY_USER_VERIFICATION_FAILED: 'User verification failed',
  PASSKEY_COUNTER_ERROR: 'Passkey counter error. Possible replay attack.',
  FORBIDDEN: 'Forbidden',
  CHART_OF_ACCOUNT_NOT_FOUND: 'Chart of account not found',
  CHART_OF_ACCOUNT_NUMBER_EXISTS: 'Account number already exists',
  CHART_OF_ACCOUNT_HAS_CHILDREN: 'Cannot delete account with sub-accounts',
  CHART_OF_ACCOUNT_IS_SYSTEM: 'Cannot modify system account',
  CHART_OF_ACCOUNT_IN_USE: 'Cannot delete account that is in use',
  CHART_OF_ACCOUNT_PARENT_TYPE_MISMATCH:
    'Parent account type must match child account type',
  JOURNAL_ENTRY_NOT_FOUND: 'Journal entry not found',
  JOURNAL_ENTRY_NOT_FOUND_OR_NOT_DELETED:
    'Journal entry not found or not deleted',
  JOURNAL_ENTRY_NUMBER_EXISTS: 'Journal entry number already exists',
  JOURNAL_ENTRY_ALREADY_POSTED: 'Journal entry is already posted',
  JOURNAL_ENTRY_ALREADY_VOIDED: 'Journal entry is already voided',
  JOURNAL_ENTRY_CANNOT_MODIFY_POSTED: 'Cannot modify a posted journal entry',
  JOURNAL_ENTRY_CANNOT_DELETE_POSTED: 'Cannot delete a posted journal entry',
  JOURNAL_ENTRY_NOT_BALANCED:
    'Journal entry is not balanced (debits must equal credits)',
  JOURNAL_ENTRY_INSUFFICIENT_LINES: 'Journal entry must have at least 2 lines',
  JOURNAL_ENTRY_LINE_INVALID:
    'Journal entry line must have either debit or credit, but not both',
  JOURNAL_ENTRY_CANNOT_POST_DRAFT:
    'Cannot post a draft journal entry without validation',
  JOURNAL_ENTRY_CANNOT_VOID_POSTED:
    'Cannot void a posted journal entry. Reverse it instead.',
  JOURNAL_ENTRY_CANNOT_REVERSE_DRAFT:
    'Cannot reverse a draft journal entry. Only posted entries can be reversed.',
  JOURNAL_ENTRY_CANNOT_REVERSE_VOIDED: 'Cannot reverse a voided journal entry.',
  JOURNAL_ENTRY_ALREADY_REVERSED: 'Journal entry has already been reversed',
  JOURNAL_ENTRY_REVERSAL_DATE_REQUIRED: 'Reversal date is required',
  BALANCE_HISTORY_NOT_FOUND: 'Balance history record not found',
  TAX_NOT_FOUND: 'Tax not found',
  TAX_NOT_DELETED: 'Tax is not deleted and cannot be restored',
  TAX_GROUP_NOT_FOUND: 'Tax group not found',
  TAX_GROUP_NOT_DELETED: 'Tax group is not deleted and cannot be restored',
  TAX_GROUP_HAS_NO_TAXES: 'Tax group must have at least one tax',
  INVALID_TAX_IDS:
    'One or more tax IDs are invalid or do not belong to this tenant',
  TAX_EXEMPTION_NOT_FOUND: 'Tax exemption not found',
  TAX_EXEMPTION_NOT_DELETED:
    'Tax exemption is not deleted and cannot be restored',
} as const
