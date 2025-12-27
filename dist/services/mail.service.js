"use strict";
/**
 * Mail Service
 * Handles email sending using AWS SES API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
exports.verifyMailConnection = verifyMailConnection;
exports.closeMailTransporter = closeMailTransporter;
const client_ses_1 = require("@aws-sdk/client-ses");
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const mail_1 = require("../constants/mail");
const mailTemplate_1 = require("../utils/mailTemplate");
/**
 * AWS SES Client
 */
let sesClient = null;
/**
 * Initialize SES client
 */
function getSESClient() {
    if (sesClient) {
        return sesClient;
    }
    sesClient = new client_ses_1.SESClient({
        region: env_1.env.AWS_REGION,
        ...(env_1.env.AWS_ACCESS_KEY_ID && env_1.env.AWS_SECRET_ACCESS_KEY
            ? {
                credentials: {
                    accessKeyId: env_1.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: env_1.env.AWS_SECRET_ACCESS_KEY,
                },
            }
            : {}),
    });
    logger_1.default.info("AWS SES client initialized");
    return sesClient;
}
/**
 * Send email using AWS SES API
 */
async function sendMail(options) {
    try {
        // Render HTML template
        const html = await (0, mailTemplate_1.renderMailTemplate)(options.template, options.context);
        // Get subject (handle both static and dynamic subjects)
        const subjectValue = mail_1.MAIL_SUBJECTS[options.template];
        const subject = typeof subjectValue === "function"
            ? subjectValue(options.context["tenantName"])
            : subjectValue;
        // Prepare destination
        const destination = {
            ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
        };
        if (options.cc) {
            destination.CcAddresses = Array.isArray(options.cc)
                ? options.cc
                : [options.cc];
        }
        if (options.bcc) {
            destination.BccAddresses = Array.isArray(options.bcc)
                ? options.bcc
                : [options.bcc];
        }
        // Prepare send email command
        const command = new client_ses_1.SendEmailCommand({
            Source: options.from ?? `${env_1.env.EMAIL_FROM_NAME} <${env_1.env.EMAIL_FROM}>`,
            Destination: destination,
            Message: {
                Subject: {
                    Data: options.subject ?? subject,
                    Charset: "UTF-8",
                },
                Body: {
                    Html: {
                        Data: html,
                        Charset: "UTF-8",
                    },
                },
            },
            ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        });
        // Send email using SES client
        const client = getSESClient();
        const response = await client.send(command);
        const messageId = response.MessageId ?? "unknown";
        logger_1.default.info(`Email sent successfully: ${messageId}`, {
            to: options.to,
            template: options.template,
            messageId,
        });
        return {
            success: true,
            messageId,
        };
    }
    catch (error) {
        logger_1.default.error("Failed to send email:", {
            error,
            to: options.to,
            template: options.template,
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
/**
 * Verify SES configuration
 * Note: AWS SES doesn't have a direct "verify" like SMTP, so we just check if credentials are configured
 */
async function verifyMailConnection() {
    try {
        getSESClient();
        logger_1.default.info("AWS SES client initialized successfully");
        return true;
    }
    catch (error) {
        logger_1.default.error("AWS SES client initialization failed:", error);
        return false;
    }
}
/**
 * Close SES client
 */
function closeMailTransporter() {
    if (sesClient) {
        sesClient.destroy();
        sesClient = null;
        logger_1.default.info("AWS SES client closed");
    }
}
