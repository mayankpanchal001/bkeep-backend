/**
 * Mail constants
 */

import { MailTemplate } from '@/types/mail.type'

/**
 * Mail template paths
 */
export const MAIL_TEMPLATES = {
  [MailTemplate.PASSWORD_RESET]: 'password-reset.html',
  [MailTemplate.PASSWORD_RESET_SUCCESS]: 'password-reset-success.html',
  [MailTemplate.MFA_OTP]: 'mfa-otp.html',
  [MailTemplate.TOTP_SETUP]: 'totp-setup.html',
  [MailTemplate.INVITATION]: 'invitation.html',
  [MailTemplate.WELCOME]: 'welcome.html',
} as const

/**
 * Mail subjects
 */
export const MAIL_SUBJECTS = {
  [MailTemplate.PASSWORD_RESET]: 'Reset Your Password - BKeep',
  [MailTemplate.PASSWORD_RESET_SUCCESS]: 'Your Password Has Been Reset - BKeep',
  [MailTemplate.MFA_OTP]: 'Your BKeep Verification Code',
  [MailTemplate.TOTP_SETUP]: 'Two-Factor Authentication Configured - BKeep',
  [MailTemplate.INVITATION]: (tenantName: string) =>
    `You're invited to join ${tenantName} on BKeep`,
  [MailTemplate.WELCOME]: (tenantName: string) =>
    `Welcome to ${tenantName} on BKeep`,
} as const

/**
 * Mail queue names
 */
export const MAIL_QUEUE_NAME = 'mail-queue'

/**
 * Mail job names
 */
export const MAIL_JOB_NAMES = {
  SEND_MAIL: 'send-mail',
} as const

/**
 * Mail worker concurrency
 * Number of jobs the worker can process simultaneously
 */
export const MAIL_WORKER_CONCURRENCY = 5
