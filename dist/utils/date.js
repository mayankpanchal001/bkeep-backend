"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateToISOString = exports.formatDateToString = exports.parseDateStringToUTC = exports.parseToUTCDate = exports.getCurrentISOString = exports.getCurrentDate = exports.getCurrentMoment = void 0;
const moment_1 = __importDefault(require("moment"));
/**
 * Get current moment in UTC
 * @returns Moment object in UTC
 */
const getCurrentMoment = () => {
    return (0, moment_1.default)().utc();
};
exports.getCurrentMoment = getCurrentMoment;
/**
 * Get current date in UTC
 * @returns Date object
 */
const getCurrentDate = () => {
    return (0, exports.getCurrentMoment)().toDate();
};
exports.getCurrentDate = getCurrentDate;
/**
 * Get current ISO string in UTC
 * @returns ISO string
 */
const getCurrentISOString = () => {
    return (0, exports.getCurrentMoment)().toISOString();
};
exports.getCurrentISOString = getCurrentISOString;
/**
 * Parse a date value and convert to UTC Date
 * @param date - Date value (string, Date, or moment object)
 * @returns Date object in UTC
 */
const parseToUTCDate = (date) => {
    return (0, moment_1.default)(date).utc().toDate();
};
exports.parseToUTCDate = parseToUTCDate;
/**
 * Parse a date string (YYYY-MM-DD) or Date object and convert to UTC Date at start of day
 * @param dateInput - Date string in YYYY-MM-DD format or Date object
 * @returns Date object in UTC at start of day (00:00:00)
 */
const parseDateStringToUTC = (dateInput) => {
    if (typeof dateInput === "string") {
        return (0, moment_1.default)(dateInput).utc().startOf("day").toDate();
    }
    // If it's already a Date object, convert to UTC and set to start of day
    return (0, moment_1.default)(dateInput).utc().startOf("day").toDate();
};
exports.parseDateStringToUTC = parseDateStringToUTC;
/**
 * Format a Date object to YYYY-MM-DD string
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
const formatDateToString = (date) => {
    if (!date)
        return null;
    return (0, moment_1.default)(date).utc().format("YYYY-MM-DD");
};
exports.formatDateToString = formatDateToString;
/**
 * Convert a Date object to ISO string (for Objection JSON schema validation)
 * @param date - Date object, string, or null/undefined
 * @returns ISO string or null
 */
const formatDateToISOString = (date) => {
    if (!date)
        return null;
    return (0, moment_1.default)(date).utc().toISOString();
};
exports.formatDateToISOString = formatDateToISOString;
