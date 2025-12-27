/**
 * Mail Service
 * Handles email sending using AWS SES API
 */

import { MailJobResult, MailOptions } from '@/types/mail.type'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { env } from '@config/env'
import logger from '@config/logger'
import { MAIL_SUBJECTS } from '@constants/mail'
import { renderMailTemplate } from '@utils/mailTemplate'

/**
 * AWS SES Client
 */
let sesClient: SESClient | null = null

/**
 * Initialize SES client
 */
function getSESClient(): SESClient {
  if (sesClient) {
    return sesClient
  }

  sesClient = new SESClient({
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  })

  logger.info('AWS SES client initialized')

  return sesClient
}

/**
 * Send email using AWS SES API
 */
export async function sendMail(options: MailOptions): Promise<MailJobResult> {
  try {
    // Render HTML template
    const html = await renderMailTemplate(options.template, options.context)

    // Get subject (handle both static and dynamic subjects)
    const subjectValue = MAIL_SUBJECTS[options.template]
    const subject =
      typeof subjectValue === 'function'
        ? subjectValue(options.context['tenantName'] as string)
        : subjectValue

    // Prepare destination
    const destination: {
      ToAddresses: string[]
      CcAddresses?: string[]
      BccAddresses?: string[]
    } = {
      ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
    }

    if (options.cc) {
      destination.CcAddresses = Array.isArray(options.cc)
        ? options.cc
        : [options.cc]
    }

    if (options.bcc) {
      destination.BccAddresses = Array.isArray(options.bcc)
        ? options.bcc
        : [options.bcc]
    }

    // Prepare send email command
    const command = new SendEmailCommand({
      Source: options.from ?? `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM}>`,
      Destination: destination,
      Message: {
        Subject: {
          Data: options.subject ?? subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
    })

    // Send email using SES client
    const client = getSESClient()
    const response = await client.send(command)

    const messageId = response.MessageId ?? 'unknown'

    logger.info(`Email sent successfully: ${messageId}`, {
      to: options.to,
      template: options.template,
      messageId,
    })

    return {
      success: true,
      messageId,
    }
  } catch (error) {
    logger.error('Failed to send email:', {
      error,
      to: options.to,
      template: options.template,
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Verify SES configuration
 * Note: AWS SES doesn't have a direct "verify" like SMTP, so we just check if credentials are configured
 */
export async function verifyMailConnection(): Promise<boolean> {
  try {
    getSESClient()
    logger.info('AWS SES client initialized successfully')
    return true
  } catch (error) {
    logger.error('AWS SES client initialization failed:', error)
    return false
  }
}

/**
 * Close SES client
 */
export function closeMailTransporter(): void {
  if (sesClient) {
    sesClient.destroy()
    sesClient = null
    logger.info('AWS SES client closed')
  }
}
