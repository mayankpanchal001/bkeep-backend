"use strict";
/**
 * Mail constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIL_WORKER_CONCURRENCY = exports.MAIL_JOB_NAMES = exports.MAIL_QUEUE_NAME = exports.MAIL_SUBJECTS = exports.MAIL_TEMPLATES = void 0;
const mail_type_1 = require("../types/mail.type");
/**
 * Mail template paths
 */
exports.MAIL_TEMPLATES = {
    [mail_type_1.MailTemplate.PASSWORD_RESET]: "password-reset.html",
    [mail_type_1.MailTemplate.PASSWORD_RESET_SUCCESS]: "password-reset-success.html",
    [mail_type_1.MailTemplate.MFA_OTP]: "mfa-otp.html",
    [mail_type_1.MailTemplate.TOTP_SETUP]: "totp-setup.html",
    [mail_type_1.MailTemplate.INVITATION]: "invitation.html",
    [mail_type_1.MailTemplate.WELCOME]: "welcome.html",
};
/**
 * Mail subjects
 */
exports.MAIL_SUBJECTS = {
    [mail_type_1.MailTemplate.PASSWORD_RESET]: "Reset Your Password - BKeep",
    [mail_type_1.MailTemplate.PASSWORD_RESET_SUCCESS]: "Your Password Has Been Reset - BKeep",
    [mail_type_1.MailTemplate.MFA_OTP]: "Your BKeep Verification Code",
    [mail_type_1.MailTemplate.TOTP_SETUP]: "Two-Factor Authentication Configured - BKeep",
    [mail_type_1.MailTemplate.INVITATION]: (tenantName) => `You're invited to join ${tenantName} on BKeep`,
    [mail_type_1.MailTemplate.WELCOME]: (tenantName) => `Welcome to ${tenantName} on BKeep`,
};
/**
 * Mail queue names
 */
exports.MAIL_QUEUE_NAME = "mail-queue";
/**
 * Mail job names
 */
exports.MAIL_JOB_NAMES = {
    SEND_MAIL: "send-mail",
};
/**
 * Mail worker concurrency
 * Number of jobs the worker can process simultaneously
 */
exports.MAIL_WORKER_CONCURRENCY = 5;
