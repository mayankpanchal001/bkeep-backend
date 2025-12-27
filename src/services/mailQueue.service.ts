/**
 * Mail Queue Service
 * Helper service for adding common email types to the queue
 */

import {
  MailTemplate,
  MfaOtpMailData,
  PasswordResetMailData,
  PasswordResetSuccessMailData,
  TotpSetupMailData,
  UserInvitationMailData,
  WelcomeMailData,
} from '@/types/mail.type'
import { MAIL_SUBJECTS } from '@constants/mail'
import { addMailJob } from '@queues/mail.queue'

/**
 * Queue password reset email
 */
export async function queuePasswordResetEmail(
  data: PasswordResetMailData
): Promise<void> {
  await addMailJob({
    to: data.to,
    subject: MAIL_SUBJECTS[MailTemplate.PASSWORD_RESET],
    template: MailTemplate.PASSWORD_RESET,
    context: {
      resetUrl: data.resetUrl,
      expiryMinutes: data.expiryMinutes,
      userName: data.userName ?? 'User',
    },
  })
}

/**
 * Queue MFA OTP email
 */
export async function queueMfaOtpEmail(data: MfaOtpMailData): Promise<void> {
  await addMailJob({
    to: data.to,
    subject: MAIL_SUBJECTS[MailTemplate.MFA_OTP],
    template: MailTemplate.MFA_OTP,
    context: {
      otpCode: data.otpCode,
      expiryMinutes: data.expiryMinutes,
      userName: data.userName ?? 'User',
    },
  })
}

/**
 * Queue user invitation email
 */
export async function queueUserInvitationEmail(
  data: UserInvitationMailData
): Promise<void> {
  const subjectFn = MAIL_SUBJECTS[MailTemplate.INVITATION]
  const subject =
    typeof subjectFn === 'function' ? subjectFn(data.tenantName) : subjectFn

  await addMailJob({
    to: data.to,
    subject,
    template: MailTemplate.INVITATION,
    context: {
      acceptUrl: data.acceptUrl,
      tenantName: data.tenantName,
      expiryDays: data.expiryDays,
      userName: data.userName ?? 'User',
      invitedBy: data.invitedBy ?? 'the organization',
    },
  })
}

/**
 * Queue welcome email
 */
export async function queueWelcomeEmail(data: WelcomeMailData): Promise<void> {
  const subjectFn = MAIL_SUBJECTS[MailTemplate.WELCOME]
  const subject =
    typeof subjectFn === 'function' ? subjectFn(data.tenantName) : subjectFn

  await addMailJob({
    to: data.to,
    subject,
    template: MailTemplate.WELCOME,
    context: {
      userName: data.userName,
      tenantName: data.tenantName,
      loginUrl: data.loginUrl,
    },
  })
}

/**
 * Queue password reset success email
 */
export async function queuePasswordResetSuccessEmail(
  data: PasswordResetSuccessMailData
): Promise<void> {
  await addMailJob({
    to: data.to,
    subject: MAIL_SUBJECTS[MailTemplate.PASSWORD_RESET_SUCCESS],
    template: MailTemplate.PASSWORD_RESET_SUCCESS,
    context: {
      userName: data.userName ?? 'User',
      loginUrl: data.loginUrl,
    },
  })
}

/**
 * Queue TOTP setup email
 */
export async function queueTotpSetupEmail(
  data: TotpSetupMailData
): Promise<void> {
  await addMailJob({
    to: data.to,
    subject: MAIL_SUBJECTS[MailTemplate.TOTP_SETUP],
    template: MailTemplate.TOTP_SETUP,
    context: {
      userName: data.userName,
      recoveryCodesUrl: data.recoveryCodesUrl,
      disableTotpUrl: data.disableTotpUrl,
    },
  })
}
