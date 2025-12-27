# Mail Queue & Email Service

## Overview

Bkeep uses **BullMQ** for job queue management and **AWS SES** for sending emails. This provides a robust, scalable, and reliable email delivery system with retry logic and monitoring capabilities.

## Architecture

```
Application
    ↓ (queue job)
BullMQ Queue (Redis)
    ↓ (worker picks up)
BullMQ Worker
    ↓ (renders template & sends)
AWS SES API
    ↓ (delivers)
Recipient Email
```

### Components

1. **Queue** (`src/queues/mail.queue.ts`) - For adding jobs
2. **Worker** (`src/workers/mail.worker.ts`) - For processing jobs (standalone process)
3. **Mail Service** (`src/services/mail.service.ts`) - Renders templates & sends via AWS SES
4. **Mail Queue Service** (`src/services/mailQueue.service.ts`) - Helper functions for queueing

## Technology Stack

- **BullMQ** - Redis-based job queue (not Bull!)
- **Redis** - Job queue storage
- **AWS SES** - Email delivery service
- **Handlebars** - Email template rendering

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=yourpassword

# AWS SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SES_FROM_NAME=Your App Name

# Mail Queue Configuration
MAIL_QUEUE_ENABLED=true
MAIL_WORKER_CONCURRENCY=5  # Number of parallel jobs
```

### Redis Connection

```typescript
// Location: src/config/redis.ts

export const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,  // Required for BullMQ
  enableReadyCheck: false,
}
```

## Mail Queue

### Queue Definition

```typescript
// Location: src/queues/mail.queue.ts

import { Queue } from 'bullmq'
import { redisConnection } from '@config/redis'

export const mailQueue = new Queue(MAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,              // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,            // Start with 2s delay
    },
    removeOnComplete: {
      age: 24 * 3600,         // Keep completed jobs for 24 hours
      count: 1000,            // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600,     // Keep failed jobs for 7 days
    },
  },
})
```

### Adding Jobs to Queue

```typescript
// Location: src/services/mailQueue.service.ts

export const addMailJob = async (
  jobName: string,
  mailOptions: MailOptions
): Promise<Job> => {
  // Check if queue is enabled
  if (!env.MAIL_QUEUE_ENABLED) {
    // Fallback to direct send (dev mode)
    await sendMail(mailOptions)
    return
  }
  
  // Add to queue
  const job = await mailQueue.add(jobName, mailOptions, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
  
  return job
}
```

## Mail Worker

### Worker Process

```typescript
// Location: src/workers/mail.worker.ts

import { Worker, Job } from 'bullmq'
import { sendMail } from '@services/mail.service'

const worker = new Worker(
  MAIL_QUEUE_NAME,
  async (job: Job) => {
    logger.info(`Processing mail job: ${job.name}`, { jobId: job.id })
    
    try {
      const result = await sendMail(job.data)
      logger.info(`Mail sent successfully`, { 
        jobId: job.id,
        messageId: result.messageId 
      })
      return result
    } catch (error) {
      logger.error(`Failed to send mail`, { 
        jobId: job.id,
        error 
      })
      throw error  // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: MAIL_WORKER_CONCURRENCY,  // Process 5 jobs in parallel
  }
)

// Event Listeners
worker.on('completed', (job) => {
  logger.info(`Job completed`, { jobId: job.id })
})

worker.on('failed', (job, error) => {
  logger.error(`Job failed`, { jobId: job?.id, error })
})

// Graceful Shutdown
process.on('SIGTERM', async () => {
  await worker.close()
  process.exit(0)
})
```

### Running the Worker

```bash
# Development
pnpm worker:mail

# Production (using PM2)
pm2 start dist/workers/mail.worker.js --name mail-worker

# Check status
pm2 status

# View logs
pm2 logs mail-worker
```

## Mail Service

### AWS SES Integration

```typescript
// Location: src/services/mail.service.ts

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export const sendMail = async (
  options: MailOptions
): Promise<MailJobResult> => {
  try {
    // 1. Render HTML template
    const html = renderMailTemplate(options.template, options.context)
    
    // 2. Prepare SES command
    const command = new SendEmailCommand({
      Source: `${env.AWS_SES_FROM_NAME} <${env.AWS_SES_FROM_EMAIL}>`,
      Destination: {
        ToAddresses: [options.to],
        CcAddresses: options.cc,
        BccAddresses: options.bcc,
      },
      Message: {
        Subject: {
          Data: options.subject,
        },
        Body: {
          Html: {
            Data: html,
          },
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
    })
    
    // 3. Send via AWS SES
    const result = await sesClient.send(command)
    
    return {
      success: true,
      messageId: result.MessageId,
    }
  } catch (error) {
    logger.error('Failed to send email', { error, options })
    return {
      success: false,
      error: error.message,
    }
  }
}
```

## Email Templates

### Template Location

```
public/templates/
├── invitation.html           # User invitation email
├── mfa-otp.html              # MFA OTP code
├── password-reset.html       # Password reset link
├── password-reset-success.html  # Password reset confirmation
└── welcome.html              # Welcome email
```

### Template Structure

```html
<!-- public/templates/mfa-otp.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Verification Code</title>
</head>
<body>
  <h1>Verification Code</h1>
  <p>Hello {{userName}},</p>
  <p>Your verification code is:</p>
  <h2>{{otpCode}}</h2>
  <p>This code will expire in {{expiryMinutes}} minutes.</p>
</body>
</html>
```

### Rendering Templates

```typescript
// Location: src/utils/mailTemplate.ts

import Handlebars from 'handlebars'
import fs from 'fs'
import path from 'path'

export const renderMailTemplate = (
  templateName: string,
  context: Record<string, any>
): string => {
  // Read template file
  const templatePath = path.join(
    __dirname,
    '../../public/templates',
    `${templateName}.html`
  )
  const templateSource = fs.readFileSync(templatePath, 'utf-8')
  
  // Compile and render
  const template = Handlebars.compile(templateSource)
  return template(context)
}
```

## Email Types

### 1. MFA OTP Email

```typescript
// Queue MFA OTP email
export const queueMfaOtpEmail = async (options: {
  to: string
  otpCode: string
  expiryMinutes: number
}): Promise<void> => {
  await addMailJob(MAIL_JOB_NAMES.MFA_OTP, {
    template: MAIL_TEMPLATES.MFA_OTP,
    to: options.to,
    subject: MAIL_SUBJECTS.MFA_OTP,
    context: {
      otpCode: options.otpCode,
      expiryMinutes: options.expiryMinutes,
    },
  })
}

// Usage in controller
try {
  await queueMfaOtpEmail({
    to: user.email,
    otpCode: '123456',
    expiryMinutes: 5,
  })
  logger.info(`MFA OTP email queued for ${user.email}`)
} catch (error) {
  logger.error('Failed to queue MFA OTP email', { error })
}
```

### 2. Password Reset Email

```typescript
export const queuePasswordResetEmail = async (options: {
  to: string
  resetUrl: string
  expiryMinutes: number
}): Promise<void> => {
  await addMailJob(MAIL_JOB_NAMES.PASSWORD_RESET, {
    template: MAIL_TEMPLATES.PASSWORD_RESET,
    to: options.to,
    subject: MAIL_SUBJECTS.PASSWORD_RESET,
    context: {
      resetUrl: options.resetUrl,
      expiryMinutes: options.expiryMinutes,
    },
  })
}
```

### 3. User Invitation Email

```typescript
export const queueUserInvitationEmail = async (options: {
  to: string
  acceptUrl: string
  tenantName: string
  expiryDays: number
}): Promise<void> => {
  await addMailJob(MAIL_JOB_NAMES.USER_INVITATION, {
    template: MAIL_TEMPLATES.USER_INVITATION,
    to: options.to,
    subject: MAIL_SUBJECTS.USER_INVITATION,
    context: {
      acceptUrl: options.acceptUrl,
      tenantName: options.tenantName,
      expiryDays: options.expiryDays,
    },
  })
}
```

### 4. Welcome Email

```typescript
export const queueWelcomeEmail = async (options: {
  to: string
  userName: string
  loginUrl: string
}): Promise<void> => {
  await addMailJob(MAIL_JOB_NAMES.WELCOME, {
    template: MAIL_TEMPLATES.WELCOME,
    to: options.to,
    subject: MAIL_SUBJECTS.WELCOME,
    context: {
      userName: options.userName,
      loginUrl: options.loginUrl,
    },
  })
}
```

## Constants

### Mail Constants

```typescript
// Location: src/constants/mail.ts

export const MAIL_QUEUE_NAME = 'mail-queue'

export const MAIL_JOB_NAMES = {
  MFA_OTP: 'mfa-otp',
  PASSWORD_RESET: 'password-reset',
  PASSWORD_RESET_SUCCESS: 'password-reset-success',
  USER_INVITATION: 'user-invitation',
  WELCOME: 'welcome',
} as const

export const MAIL_TEMPLATES = {
  MFA_OTP: 'mfa-otp',
  PASSWORD_RESET: 'password-reset',
  PASSWORD_RESET_SUCCESS: 'password-reset-success',
  USER_INVITATION: 'invitation',
  WELCOME: 'welcome',
} as const

export const MAIL_SUBJECTS = {
  MFA_OTP: 'Your Verification Code',
  PASSWORD_RESET: 'Reset Your Password',
  PASSWORD_RESET_SUCCESS: 'Password Reset Successful',
  USER_INVITATION: 'You have been invited to join',
  WELCOME: 'Welcome to Bkeep',
} as const

export const MAIL_WORKER_CONCURRENCY = 5
```

## Error Handling

### Retry Logic

```typescript
// BullMQ automatically retries failed jobs
{
  attempts: 3,                // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000,              // 2s, 4s, 8s
  },
}
```

### Failed Job Handling

```typescript
// Failed jobs are kept for 7 days
{
  removeOnFail: {
    age: 7 * 24 * 3600,       // 7 days
  },
}

// Check failed jobs
import { mailQueue } from '@queues/mail.queue'

const failed = await mailQueue.getFailed()
console.log('Failed jobs:', failed.length)

// Retry failed job
const job = await mailQueue.getJob(jobId)
await job.retry()
```

### Graceful Degradation

```typescript
// If queue is disabled, send email directly
if (!env.MAIL_QUEUE_ENABLED) {
  await sendMail(mailOptions)  // Fallback to direct send
}

// Always handle email failures gracefully
try {
  await queueMfaOtpEmail({ ... })
} catch (error) {
  logger.error('Failed to queue email', { error })
  // Don't fail the request!
}
```

## Monitoring

### Queue Metrics

```typescript
// Get queue statistics
const counts = await mailQueue.getJobCounts()
console.log({
  active: counts.active,
  waiting: counts.waiting,
  completed: counts.completed,
  failed: counts.failed,
  delayed: counts.delayed,
})

// Get jobs by status
const activeJobs = await mailQueue.getActive()
const failedJobs = await mailQueue.getFailed()
const completedJobs = await mailQueue.getCompleted()
```

### Worker Events

```typescript
worker.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    name: job.name,
    result,
  })
})

worker.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job?.id,
    name: job?.name,
    error,
    attemptsMade: job?.attemptsMade,
  })
})

worker.on('progress', (job, progress) => {
  logger.debug('Job progress', {
    jobId: job.id,
    progress,
  })
})
```

## Best Practices

### 1. Always Queue Emails

```typescript
// ✅ Good - Queue email (don't block request)
try {
  await queueMfaOtpEmail({ ... })
  logger.info('Email queued successfully')
} catch (error) {
  logger.error('Failed to queue email', { error })
}

// ❌ Bad - Send email synchronously (blocks request)
await sendMail({ ... })  // Slow!
```

### 2. Handle Failures Gracefully

```typescript
// ✅ Good - Don't fail the request if email fails
try {
  await queueUserInvitationEmail({ ... })
} catch (error) {
  logger.error('Failed to queue invitation email', { error })
  // Continue with request
}

// ❌ Bad - Fail the entire request
await queueUserInvitationEmail({ ... })  // Throws error!
```

### 3. Use Try/Catch

```typescript
// ✅ Good
export const sendPasswordReset = asyncHandler(
  async (req, res) => {
    // ... create reset token
    
    try {
      await queuePasswordResetEmail({ ... })
      logger.info('Password reset email queued')
    } catch (error) {
      logger.error('Failed to queue email', { error })
    }
    
    // Always return success (prevent email enumeration)
    res.json(new ApiResponse(HTTP_STATUS.OK, 'Email sent'))
  }
)
```

### 4. Use Specific Job Names

```typescript
// ✅ Good - Specific job names
MAIL_JOB_NAMES.MFA_OTP
MAIL_JOB_NAMES.PASSWORD_RESET
MAIL_JOB_NAMES.USER_INVITATION

// ❌ Bad - Generic job names
'send-email'
'email'
```

## Troubleshooting

### Worker Not Processing Jobs

**Check:**
1. Worker is running: `pm2 status`
2. Redis is accessible: `redis-cli ping`
3. Check worker logs: `pm2 logs mail-worker`
4. Check queue status: `await mailQueue.getJobCounts()`

### AWS SES Errors

```
Error: Email address is not verified
```

**Solution:**
1. Verify sender email in AWS SES console
2. For production: Move out of SES sandbox
3. Check AWS credentials are correct

### Jobs Stuck in Queue

```
Jobs are not being processed
```

**Check:**
1. Worker is running and connected to Redis
2. Check for worker errors in logs
3. Check Redis connection
4. Verify concurrency setting

### Template Not Found

```
Error: ENOENT: no such file or directory
```

**Solution:**
1. Check template exists in `public/templates/`
2. Verify template name matches constant
3. Check file permissions

## Performance Considerations

### Concurrency

```typescript
// Adjust based on your needs
const worker = new Worker(MAIL_QUEUE_NAME, processor, {
  concurrency: 5,  // Process 5 emails in parallel
})
```

### Rate Limiting

```typescript
// AWS SES has sending limits
// Free tier: 200 emails/day, 1 email/second
// Consider rate limiting in queue

import { RateLimiterRedis } from 'rate-limiter-flexible'

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 1,      // 1 email
  duration: 1,    // per second
})
```

### Job Cleanup

```typescript
// Automatically clean up old jobs
{
  removeOnComplete: {
    age: 24 * 3600,     // Remove after 24 hours
    count: 1000,        // Keep last 1000
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed for 7 days
  },
}
```

## Related Documentation

- [Authentication](./TOTP_IMPLEMENTATION.md)
- [Password Reset](./PASSWORD_RESET.md)
- [User Invitations](./USER_INVITATIONS.md)

