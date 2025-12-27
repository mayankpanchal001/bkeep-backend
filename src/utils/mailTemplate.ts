/**
 * Mail template utility
 * Loads and renders HTML email templates with context data
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { MailTemplate } from '@/types/mail.type'
import logger from '@config/logger'
import { MAIL_TEMPLATES } from '@constants/mail'
import { getCurrentMoment } from '@utils/date'

/**
 * Template cache to avoid reading files multiple times
 */
const templateCache = new Map<MailTemplate, string>()

/**
 * Load HTML template from file system
 */
async function loadTemplate(template: MailTemplate): Promise<string> {
  // Check cache first
  const cached = templateCache.get(template)
  if (cached) {
    return cached
  }

  try {
    // eslint-disable-next-line security/detect-object-injection
    const templateFileName = MAIL_TEMPLATES[template] as string
    const templatePath = join(
      __dirname,
      '..',
      '..',
      'public',
      'templates',
      templateFileName
    )
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const html = await readFile(templatePath, 'utf-8')

    // Cache the template
    templateCache.set(template, html)

    return html
  } catch (error) {
    logger.error(`Failed to load mail template ${template}:`, error)
    throw new Error(`Failed to load mail template: ${template}`)
  }
}

/**
 * Render template with context data
 * Simple template engine using {{variable}} syntax
 */
function renderTemplate(
  html: string,
  context: Record<string, unknown>
): string {
  let rendered = html

  // Replace all {{variable}} placeholders with context values
  for (const [key, value] of Object.entries(context)) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`{{${key}}}`, 'g')
    rendered = rendered.replaceAll(regex, String(value ?? ''))
  }

  // Add current year if not provided
  const currentYearKey = 'currentYear'
  // eslint-disable-next-line security/detect-object-injection
  if (!context[currentYearKey]) {
    rendered = rendered.replaceAll(
      '{{currentYear}}',
      String(getCurrentMoment().year())
    )
  }

  return rendered
}

/**
 * Load and render mail template
 */
export async function renderMailTemplate(
  template: MailTemplate,
  context: Record<string, unknown>
): Promise<string> {
  try {
    const html = await loadTemplate(template)
    return renderTemplate(html, context)
  } catch (error) {
    logger.error(`Failed to render mail template ${template}:`, error)
    throw error
  }
}

/**
 * Clear template cache (useful for testing or development)
 */
export function clearTemplateCache(): void {
  templateCache.clear()
}
