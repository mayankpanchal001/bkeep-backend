# Password Reset

## Overview

The password reset system allows users to securely reset their password via email. A secure token is generated and sent to the user's email address, which they use to set a new password. The system prevents email enumeration and ensures tokens are one-time use and time-limited.

**Key Features:**
- **Secure token generation** - Cryptographically secure random tokens
- **Email delivery** - Queued email delivery with HTML templates
- **Time-limited** - Tokens expire after 24 hours
- **One-time use** - Tokens are invalidated after use
- **Email enumeration prevention** - Always returns success message

## Flow

### Password Reset Flow

```
User requests password reset
  ↓
System generates secure token
  ↓
Token hash stored in database
  ↓
Reset email queued with token
  ↓
User receives email with link
  ↓
User clicks link & enters new password
  ↓
System verifies token
  ↓
Password updated
  ↓
Token marked as used
  ↓
All refresh tokens revoked
  ↓
Confirmation email sent
```

## Features Implemented

### ✅ Password Reset Request
- Generate secure reset tokens
- Store token hashes in database
- Queue reset emails
- Email enumeration prevention

### ✅ Password Reset Completion
- Token verification
- Password hashing and update
- Token invalidation
- Refresh token revocation

### ✅ Security Features
- Cryptographically secure tokens
- Token hashing (SHA-256)
- Time-limited tokens (24 hours)
- One-time use enforcement
- Email enumeration prevention

## Database Schema

### Migration: `create_password_resets_table.ts`

Created a new `password_resets` table with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users table |
| `token_hash` | VARCHAR(255) | SHA-256 hash of token (unique) |
| `expires_at` | TIMESTAMP | Expiration timestamp |
| `used_at` | TIMESTAMP | When token was used (null if unused) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Key Features:**
- Unique constraint on `token_hash`
- Indexes for efficient querying
- Soft delete support
- Expiration tracking

**Indexes:**
- `user_id` - For finding reset tokens by user
- `token_hash` - For token lookup (unique)
- `expires_at` - For cleanup of expired tokens
- `(user_id, deleted_at)` - For finding active tokens

## Architecture

### Technology Stack

**Backend:**
- Node.js crypto - Secure token generation
- BullMQ - Email job queue
- AWS SES - Email delivery service
- bcrypt - Password hashing

### File Structure

```
src/
├── controllers/
│   └── auth.controller.ts           # Password reset controllers
├── models/
│   └── PasswordReset.ts             # Reset token model
├── queries/
│   └── passwordReset.queries.ts     # Reset token queries
├── routes/
│   └── auth.route.ts                # Password reset routes
├── schema/
│   └── auth.schema.ts               # Validation schemas
└── services/
    └── mailQueue.service.ts        # Email queue service
```

## API Endpoints

All password reset endpoints are under `/api/v1/auth/`:

### 1. Request Password Reset

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "If the email exists, a password reset link has been sent",
  "data": {}
}
```

**Purpose:** Initiates password reset by generating token and sending email.

**Security Note:** Always returns success message regardless of whether email exists to prevent email enumeration attacks.

**Steps:**
1. User submits email
2. System finds user (if exists)
3. System generates secure token
4. Token hash stored in database
5. Reset email queued
6. Success message returned (always)

### 2. Reset Password

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successful",
  "data": {}
}
```

**Purpose:** Verifies token and updates user password.

**Steps:**
1. User submits email, token, and new password
2. System finds user by email
3. System hashes token and looks up in database
4. System verifies token is valid and not expired
5. System verifies token hasn't been used
6. Password is hashed and updated
7. Token is marked as used
8. All refresh tokens are revoked
9. Confirmation email is sent

## Code Examples

### Frontend Integration

#### Request Password Reset

```typescript
async function requestPasswordReset(email: string) {
  const res = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  
  const result = await res.json()
  // Always returns success (prevents email enumeration)
  alert('If the email exists, a password reset link has been sent')
}
```

#### Reset Password

```typescript
async function resetPassword(email: string, token: string, newPassword: string) {
  const res = await fetch('/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, password: newPassword })
  })
  
  const result = await res.json()
  
  if (result.success) {
    alert('Password reset successful! Please login with your new password.')
    window.location.href = '/login'
  }
}
```

### Backend Implementation

#### Creating Reset Token

```typescript
// Location: src/queries/passwordReset.queries.ts

export const createPasswordResetToken = async (
  userId: string
): Promise<{ resetToken: PasswordReset; plainToken: string }> => {
  // 1. Soft delete any existing reset tokens for this user
  await PasswordReset.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .patch({
      deletedAt: getCurrentDate(),
    })

  // 2. Generate secure token
  const plainToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(plainToken).digest('hex')

  // 3. Calculate expiration (24 hours default)
  const expiresAt = getCurrentMoment()
    .add(SECURITY_RULES.PASSWORD_RESET_EXPIRY_HOURS, 'hours')
    .toDate()

  // 4. Create reset token record
  const resetToken = await PasswordReset.query().insert({
    userId,
    tokenHash,
    expiresAt,
  })

  return { resetToken, plainToken }
}
```

#### Sending Reset Email

```typescript
// Location: src/controllers/auth.controller.ts

export const forgotPassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body

    // 1. Find user by email
    const user = await User.findByEmail(email)

    // 2. Always return success (prevent email enumeration)
    if (!user) {
      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          HTTP_STATUS.OK,
          SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT
        )
      )
    }

    // 3. Create reset token
    const { resetToken, plainToken } = await createPasswordResetToken(user.id)

    // 4. Send reset email
    try {
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${plainToken}&email=${encodeURIComponent(email)}`
      
      await queuePasswordResetEmail({
        to: user.email,
        resetUrl,
        expiryHours: SECURITY_RULES.PASSWORD_RESET_EXPIRY_HOURS,
        userName: user.name,
      })
      
      logger.info(`Password reset email queued for ${user.email}`)
    } catch (error) {
      logger.error('Failed to queue password reset email', { error })
      // Still return success
    }

    // 5. Return success (always)
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT
      )
    )
  }
)
```

#### Verifying and Resetting Password

```typescript
// Location: src/queries/passwordReset.queries.ts

export const findPasswordResetToken = async (
  email: string,
  token: string
): Promise<PasswordReset> => {
  // 1. Find user by email
  const user = await User.findByEmail(email)
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // 2. Hash token for lookup
  const tokenHash = createHash('sha256').update(token).digest('hex')

  // 3. Find reset token
  const resetToken = await PasswordReset.query()
    .modify('notDeleted')
    .where('user_id', user.id)
    .where('token_hash', tokenHash)
    .where('expires_at', '>', getCurrentDate())
    .whereNull('used_at')
    .first()

  if (!resetToken) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_RESET_TOKEN
    )
  }

  return resetToken
}
```

## Configuration

### Environment Variables

No additional environment variables required. Password reset uses existing mail queue and frontend URL configuration.

### Security Constants

Password reset settings in `src/constants/security.ts`:

```typescript
export const SECURITY_RULES = {
  // ... existing rules
  PASSWORD_RESET_EXPIRY_HOURS: 24,  // Token expiration time
}
```

### Email Templates

#### Password Reset Email

**Location:** `public/templates/password-reset.html`

**Template Variables:**
```typescript
{
  resetUrl: string        // Full URL with token
  expiryHours: number     // Hours until expiration (24)
  userName: string        // User's name
}
```

**Example Email:**
```
Subject: Reset Your Password

Hello John,

Click the link below to reset your password:

https://app.bkeep.ca/reset-password?token=abc123...&email=user@example.com

This link will expire in 24 hours.

If you didn't request this, please ignore this email.
```

#### Password Reset Success Email

**Location:** `public/templates/password-reset-success.html`

**Template Variables:**
```typescript
{
  userName: string        // User's name
}
```

**Example Email:**
```
Subject: Password Reset Successful

Hello John,

Your password has been successfully reset.

If you didn't make this change, please contact support immediately.
```

## Security Considerations

### ✅ Implemented Security Features

1. **Token Security**: Tokens are hashed (SHA-256) before storage
2. **Time-Limited**: Tokens expire after 24 hours
3. **One-Time Use**: Tokens are invalidated after use
4. **Email Enumeration Prevention**: Always returns success message
5. **Token Revocation**: All refresh tokens revoked after reset
6. **Old Token Invalidation**: Only most recent token is valid

### 🔒 Best Practices

1. **Always Queue Emails**: Non-blocking email delivery
2. **Invalidate Old Tokens**: Only one active token per user
3. **Prevent Email Enumeration**: Always return success message
4. **Clean Up Expired Tokens**: Periodic cleanup job
5. **Revoke Refresh Tokens**: Force re-login after password reset
6. **HTTPS Required**: Always use HTTPS in production

## Testing

### Manual Testing

```bash
# 1. Request password reset
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# 2. Reset password (use token from email)
curl -X POST http://localhost:8000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "token-from-email",
    "password": "NewPassword123!"
  }'
```

## Troubleshooting

### Common Issues

1. **Reset Email Not Received**
   - Check email was queued successfully (check logs)
   - Verify mail worker is running
   - Check email address is correct
   - Check spam folder
   - **Solution**: Request new reset link, check mail queue status

2. **Token Invalid or Expired**
   - Token has expired (24 hours)
   - Token already used
   - Token is incorrect
   - **Solution**: Request new reset link, check expiration time

3. **Token Already Used**
   - Token was already used to reset password
   - User clicked link multiple times
   - **Solution**: Request new reset link, check if password was already reset

4. **Email Enumeration**
   - System always returns success
   - Prevents revealing if email exists
   - **Solution**: This is expected behavior for security

## Migration Guide

To apply the database changes:

```bash
# Development
pnpm db:migrate

# Production
pnpm db:migrate:prod
```

To rollback:

```bash
# Development
pnpm db:migrate:rollback

# Production
pnpm db:migrate:rollback:prod
```

## Future Enhancements

Potential improvements:
1. **Resend Reset Link**: Allow users to request new link if not received
2. **Reset Attempts Tracking**: Track failed reset attempts per user
3. **Multiple Token Support**: Allow multiple active tokens
4. **SMS Reset**: Alternative delivery method
5. **Security Questions**: Additional verification step
6. **Reset History**: Show recent password reset history

## Related Documentation

- [Authentication](./AUTHENTICATION.md)
- [Mail Queue](./MAIL_QUEUE.md)
- [User Management](./USER_MANAGEMENT.md)

---

**Note:** Password reset is a critical security feature. Always use secure tokens and prevent email enumeration.
