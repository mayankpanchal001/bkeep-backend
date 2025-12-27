import moment from 'moment'

/**
 * Get current moment in UTC
 * @returns Moment object in UTC
 */
export const getCurrentMoment = () => {
  return moment().utc()
}

/**
 * Get current date in UTC
 * @returns Date object
 */
export const getCurrentDate = (): Date => {
  return getCurrentMoment().toDate()
}

/**
 * Get current ISO string in UTC
 * @returns ISO string
 */
export const getCurrentISOString = (): string => {
  return getCurrentMoment().toISOString()
}

/**
 * Parse a date value and convert to UTC Date
 * @param date - Date value (string, Date, or moment object)
 * @returns Date object in UTC
 */
export const parseToUTCDate = (date: string | Date | moment.Moment): Date => {
  return moment(date).utc().toDate()
}

/**
 * Parse a date string (YYYY-MM-DD) or Date object and convert to UTC Date at start of day
 * @param dateInput - Date string in YYYY-MM-DD format or Date object
 * @returns Date object in UTC at start of day (00:00:00)
 */
export const parseDateStringToUTC = (dateInput: string | Date): Date => {
  if (typeof dateInput === 'string') {
    return moment(dateInput).utc().startOf('day').toDate()
  }
  // If it's already a Date object, convert to UTC and set to start of day
  return moment(dateInput).utc().startOf('day').toDate()
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateToString = (
  date: Date | string | null | undefined
): string | null => {
  if (!date) return null
  return moment(date).utc().format('YYYY-MM-DD')
}

/**
 * Convert a Date object to ISO string (for Objection JSON schema validation)
 * @param date - Date object, string, or null/undefined
 * @returns ISO string or null
 */
export const formatDateToISOString = (
  date: Date | string | null | undefined
): string | null => {
  if (!date) return null
  return moment(date).utc().toISOString()
}
