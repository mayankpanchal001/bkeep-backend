"use strict";
/**
 * Mail template utility
 * Loads and renders HTML email templates with context data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMailTemplate = renderMailTemplate;
exports.clearTemplateCache = clearTemplateCache;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const logger_1 = __importDefault(require("../config/logger"));
const mail_1 = require("../constants/mail");
const date_1 = require("./date");
/**
 * Template cache to avoid reading files multiple times
 */
const templateCache = new Map();
/**
 * Load HTML template from file system
 */
async function loadTemplate(template) {
    // Check cache first
    const cached = templateCache.get(template);
    if (cached) {
        return cached;
    }
    try {
        // eslint-disable-next-line security/detect-object-injection
        const templateFileName = mail_1.MAIL_TEMPLATES[template];
        const templatePath = (0, node_path_1.join)(__dirname, "..", "..", "public", "templates", templateFileName);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const html = await (0, promises_1.readFile)(templatePath, "utf-8");
        // Cache the template
        templateCache.set(template, html);
        return html;
    }
    catch (error) {
        logger_1.default.error(`Failed to load mail template ${template}:`, error);
        throw new Error(`Failed to load mail template: ${template}`);
    }
}
/**
 * Render template with context data
 * Simple template engine using {{variable}} syntax
 */
function renderTemplate(html, context) {
    let rendered = html;
    // Replace all {{variable}} placeholders with context values
    for (const [key, value] of Object.entries(context)) {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(`{{${key}}}`, "g");
        rendered = rendered.replaceAll(regex, String(value ?? ""));
    }
    // Add current year if not provided
    const currentYearKey = "currentYear";
    // eslint-disable-next-line security/detect-object-injection
    if (!context[currentYearKey]) {
        rendered = rendered.replaceAll("{{currentYear}}", String((0, date_1.getCurrentMoment)().year()));
    }
    return rendered;
}
/**
 * Load and render mail template
 */
async function renderMailTemplate(template, context) {
    try {
        const html = await loadTemplate(template);
        return renderTemplate(html, context);
    }
    catch (error) {
        logger_1.default.error(`Failed to render mail template ${template}:`, error);
        throw error;
    }
}
/**
 * Clear template cache (useful for testing or development)
 */
function clearTemplateCache() {
    templateCache.clear();
}
