"use strict";
/**
 * Mail type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailTemplate = void 0;
/**
 * Email template types
 */
var MailTemplate;
(function (MailTemplate) {
    MailTemplate["PASSWORD_RESET"] = "password-reset";
    MailTemplate["PASSWORD_RESET_SUCCESS"] = "password-reset-success";
    MailTemplate["MFA_OTP"] = "mfa-otp";
    MailTemplate["TOTP_SETUP"] = "totp-setup";
    MailTemplate["INVITATION"] = "invitation";
    MailTemplate["WELCOME"] = "welcome";
})(MailTemplate || (exports.MailTemplate = MailTemplate = {}));
