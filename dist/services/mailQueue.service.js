"use strict";
/**
 * Mail Queue Service
 * Helper service for adding common email types to the queue
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.queuePasswordResetEmail = queuePasswordResetEmail;
exports.queueMfaOtpEmail = queueMfaOtpEmail;
exports.queueUserInvitationEmail = queueUserInvitationEmail;
exports.queueWelcomeEmail = queueWelcomeEmail;
exports.queuePasswordResetSuccessEmail = queuePasswordResetSuccessEmail;
exports.queueTotpSetupEmail = queueTotpSetupEmail;
const mail_type_1 = require("../types/mail.type");
const mail_1 = require("../constants/mail");
const mail_queue_1 = require("../queues/mail.queue");
/**
 * Queue password reset email
 */
async function queuePasswordResetEmail(data) {
    await (0, mail_queue_1.addMailJob)({
        to: data.to,
        subject: mail_1.MAIL_SUBJECTS[mail_type_1.MailTemplate.PASSWORD_RESET],
        template: mail_type_1.MailTemplate.PASSWORD_RESET,
        context: {
            resetUrl: data.resetUrl,
            expiryMinutes: data.expiryMinutes,
            userName: data.userName ?? "User",
        },
    });
}
/**
 * Queue MFA OTP email
 */
async function queueMfaOtpEmail(data) {
    await (0, mail_queue_1.addMailJob)({
        to: data.to,
        subject: mail_1.MAIL_SUBJECTS[mail_type_1.MailTemplate.MFA_OTP],
        template: mail_type_1.MailTemplate.MFA_OTP,
        context: {
            otpCode: data.otpCode,
            expiryMinutes: data.expiryMinutes,
            userName: data.userName ?? "User",
        },
    });
}
/**
 * Queue user invitation email
 */
async function queueUserInvitationEmail(data) {
    const subjectFn = mail_1.MAIL_SUBJECTS[mail_type_1.MailTemplate.INVITATION];
    const subject = typeof subjectFn === "function" ? subjectFn(data.tenantName) : subjectFn;
    await (0, mail_queue_1.addMailJob)({
        to: data.to,
        subject,
        template: mail_type_1.MailTemplate.INVITATION,
        context: {
            acceptUrl: data.acceptUrl,
            tenantName: data.tenantName,
            expiryDays: data.expiryDays,
            userName: data.userName ?? "User",
            invitedBy: data.invitedBy ?? "the organization",
        },
    });
}
/**
 * Queue welcome email
 */
async function queueWelcomeEmail(data) {
    const subjectFn = mail_1.MAIL_SUBJECTS[mail_type_1.MailTemplate.WELCOME];
    const subject = typeof subjectFn === "function" ? subjectFn(data.tenantName) : subjectFn;
    await (0, mail_queue_1.addMailJob)({
        to: data.to,
        subject,
        template: mail_type_1.MailTemplate.WELCOME,
        context: {
            userName: data.userName,
            tenantName: data.tenantName,
            loginUrl: data.loginUrl,
        },
    });
}
/**
 * Queue password reset success email
 */
async function queuePasswordResetSuccessEmail(data) {
    await (0, mail_queue_1.addMailJob)({
        to: data.to,
        subject: mail_1.MAIL_SUBJECTS[mail_type_1.MailTemplate.PASSWORD_RESET_SUCCESS],
        template: mail_type_1.MailTemplate.PASSWORD_RESET_SUCCESS,
        context: {
            userName: data.userName ?? "User",
            loginUrl: data.loginUrl,
        },
    });
}
/**
 * Queue TOTP setup email
 */
async function queueTotpSetupEmail(data) {
    await (0, mail_queue_1.addMailJob)({
        to: data.to,
        subject: mail_1.MAIL_SUBJECTS[mail_type_1.MailTemplate.TOTP_SETUP],
        template: mail_type_1.MailTemplate.TOTP_SETUP,
        context: {
            userName: data.userName,
            recoveryCodesUrl: data.recoveryCodesUrl,
            disableTotpUrl: data.disableTotpUrl,
        },
    });
}
