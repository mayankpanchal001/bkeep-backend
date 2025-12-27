/**
 * Mail type definitions
 */

/**
 * Email template types
 */
export enum MailTemplate {
  PASSWORD_RESET = 'password-reset',
  PASSWORD_RESET_SUCCESS = 'password-reset-success',
  MFA_OTP = 'mfa-otp',
  TOTP_SETUP = 'totp-setup',
  INVITATION = 'invitation',
  WELCOME = 'welcome',
}

/**
 * Base mail options
 */
export interface MailOptions {
  to: string | string[]
  subject: string
  template: MailTemplate
  context: Record<string, unknown>
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  attachments?: MailAttachment[]
}

/**
 * Mail attachment
 */
export interface MailAttachment {
  filename: string
  content?: string | Buffer
  path?: string
  contentType?: string
  encoding?: string
}

/**
 * Mail job data for queue
 */
export interface MailJobData extends MailOptions {
  jobId?: string
  attemptsMade?: number
}

/**
 * Mail job result
 */
export interface MailJobResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Password reset mail data
 */
export interface PasswordResetMailData {
  to: string
  resetUrl: string
  expiryMinutes: number
  userName?: string
}

/**
 * MFA OTP mail data
 */
export interface MfaOtpMailData {
  to: string
  otpCode: string
  expiryMinutes: number
  userName?: string
}

/**
 * User invitation mail data
 */
export interface UserInvitationMailData {
  to: string
  acceptUrl: string
  tenantName: string
  expiryDays: number
  userName?: string
  invitedBy?: string
}

/**
 * Welcome mail data
 */
export interface WelcomeMailData {
  to: string
  userName: string
  tenantName: string
  loginUrl: string
}

/**
 * Password reset success mail data
 */
export interface PasswordResetSuccessMailData {
  to: string
  userName?: string
  loginUrl: string
}

/**
 * TOTP setup mail data
 */
export interface TotpSetupMailData {
  to: string
  userName: string
  recoveryCodesUrl: string
  disableTotpUrl: string
}
