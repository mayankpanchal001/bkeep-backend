/**
 * Validation Rules
 * Standardized validation rules and constraints used throughout the application
 */
export const VALIDATION_RULES = {
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 50,
  PASSWORD_REGEX:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!$%&*?@])[\d!$%&*?@A-Za-z]/,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 20,
  FILE_SIZE_LIMIT: 10 * 1024 * 1024, // 10MB
  FILE_TYPE_LIMIT: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
} as const

/**
 * Validation Messages
 * Centralized validation error messages
 */
export const VALIDATION_MESSAGES = {
  INVITATION_TOKEN_REQUIRED: 'Invitation token is required',
  PASSWORD_MIN_LENGTH: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`,
  PASSWORD_MAX_LENGTH: `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
} as const
