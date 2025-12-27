# User Invitations

## Overview

The user invitation system allows administrators to invite new users to join their tenant. Invitations are sent via email with a secure token that expires after a set period.

## Flow

```
Admin invites user
  ↓
Invitation created with token
  ↓
Email sent with invitation link
  ↓
User clicks link & sets password
  ↓
User account created & verified
  ↓
Invitation marked as used
```

## API Endpoints

### Invite User

```typescript
POST /api/v1/users/invitation
Authorization: Bearer <admin-token>
Content-Type: application/json

Body: {
  "name": "John Doe",
  "email": "newuser@example.com",
  "roleId": "role-uuid"
  // tenantId is not required - it is automatically taken from the user's selected tenant context
}

// Response
{
  "success": true,
  "statusCode": 201,
  "message": "User invitation sent successfully",
  "data": {
    "id": "invitation-uuid",
    "email": "newuser@example.com",
    "tenant": {
      "id": "tenant-uuid",
      "name": "Acme Corp"
    },
    "role": {
      "id": "role-uuid",
      "name": "accountant",
      "displayName": "Accountant"
    },
    "token": "secure-token-here",  // Only in dev/test
    "expiresAt": "2025-01-20T00:00:00.000Z",
    "createdAt": "2025-01-15T00:00:00.000Z"
  }
}
```

**Authorization:**
- All users can only invite users to their selected tenant
- Tenant ID is automatically extracted from `req.user.selectedTenantId` (JWT token)
- No tenant context middleware required (only tenantId needed, not schema name)

### List Pending Invitations

```typescript
GET /api/v1/users/invitations?page=1&limit=10&sort=createdAt&order=desc&search=user@example.com
Authorization: Bearer <admin-token>

// Response
{
  "success": true,
  "statusCode": 200,
  "message": "Invitations retrieved successfully",
  "data": {
    "items": [
      {
        "id": "invitation-uuid",
        "email": "newuser@example.com",
        "userName": "New User",
        "tenant": {
          "id": "tenant-uuid",
          "name": "Acme Corp",
          "schemaName": "tenant_acme"
        },
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sort` (optional): Sort field - `email`, `createdAt`, `updatedAt` (default: `createdAt`)
- `order` (optional): Sort order - `asc` or `desc` (default: `asc`)
- `search` (optional): Search by user email or name

**Authorization:**
- All users can only see invitations for their selected tenant

### Revoke Invitation

```typescript
DELETE /api/v1/users/invitations/:invitationId
Authorization: Bearer <admin-token>

// Response
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation revoked successfully",
  "data": {
    "id": "invitation-uuid",
    "email": "newuser@example.com",
    "tenant": {
      "id": "tenant-uuid",
      "name": "Acme Corp",
      "schemaName": "tenant_acme"
    },
    "deletedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Authorization:**
- All users can only revoke invitations for their selected tenant

### Resend Invitation

```typescript
POST /api/v1/users/invitations/:invitationId/resend
Authorization: Bearer <admin-token>

// Response
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation email resent successfully",
  "data": {
    "id": "invitation-uuid",
    "email": "newuser@example.com",
    "tenant": {
      "id": "tenant-uuid",
      "name": "Acme Corp",
      "schemaName": "tenant_acme"
    },
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Authorization:**
- All users can only resend invitations for their selected tenant

**Note:** This endpoint generates a new token for the invitation, invalidating the previous token.

### Accept Invitation

```typescript
POST /api/v1/auth/accept-invitation
Content-Type: application/json

Body: {
  "token": "invitation-token",
  "password": "SecurePassword123!"
}

// Response
{
  "success": true,
  "statusCode": 200,
  "message": "Invitation accepted successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "newuser@example.com",
      "name": null,
      "isVerified": true,
      "isActive": true
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

## Database Schema

### user_invitations Table

```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

**Indexes:**
- `email` - For finding invitations by email
- `token_hash` - For token lookup (unique)
- `tenant_id` - For tenant-specific queries
- `expires_at` - For cleanup of expired invitations

## Implementation Details

### Creating Invitation

```typescript
// Location: src/queries/userInvitation.queries.ts

export const createUserInvitation = async (
  data: CreateUserInvitationData
): Promise<{ invitation: UserInvitation; plainToken: string }> => {
  // 1. Check if user already exists
  const existingUser = await User.findByEmail(data.email)
  if (existingUser) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_MESSAGES.USER_ALREADY_EXISTS
    )
  }

  // 2. Check if active invitation exists
  const existingInvitation = await UserInvitation.query()
    .modify('notDeleted')
    .where('email', data.email)
    .where('tenant_id', data.tenantId)
    .where('expires_at', '>', new Date())
    .first()

  if (existingInvitation) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_MESSAGES.INVITATION_ALREADY_EXISTS
    )
  }

  // 3. Generate secure token
  const plainToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(plainToken).digest('hex')

  // 4. Calculate expiration (7 days default)
  const expiresAt = moment()
    .add(SECURITY_RULES.INVITATION_EXPIRY_DAYS, 'days')
    .toDate()

  // 5. Create invitation
  const invitation = await UserInvitation.query().insert({
    email: data.email,
    tokenHash,
    tenantId: data.tenantId,
    roleId: data.roleId,
    invitedBy: data.invitedBy,
    expiresAt,
  })

  return { invitation, plainToken }
}
```

### Sending Invitation Email

```typescript
// Location: src/controllers/userInvitation.controller.ts

try {
  const acceptUrl = `${env.FRONTEND_URL}/accept-invitation?token=${plainToken}`
  
  await queueUserInvitationEmail({
    to: invitation.user?.email ?? email,
    acceptUrl,
    tenantName: tenant.name,
    expiryDays: SECURITY_RULES.INVITATION_EXPIRY_DAYS,
  })
  
  logger.info(`Invitation email queued for ${email}`)
} catch (error) {
  logger.error('Failed to queue invitation email:', error)
  // Don't fail the request - invitation is created
}
```

### Accepting Invitation

```typescript
// Location: src/queries/userInvitation.queries.ts

export const acceptUserInvitation = async (
  token: string,
  password: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  // 1. Hash token for lookup
  const tokenHash = createHash('sha256').update(token).digest('hex')

  // 2. Find invitation
  const invitation = await UserInvitation.query()
    .modify('notDeleted')
    .where('token_hash', tokenHash)
    .where('expires_at', '>', new Date())
    .whereNull('accepted_at')
    .withGraphFetched('[tenant, role]')
    .first()

  if (!invitation) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.INVITATION_INVALID_OR_EXPIRED
    )
  }

  // 3. Check if user already exists
  const existingUser = await User.findByEmail(invitation.email)
  if (existingUser) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_MESSAGES.USER_ALREADY_EXISTS
    )
  }

  // 4. Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // 5. Create user account
  const user = await User.query().insert({
    email: invitation.email,
    password: hashedPassword,
    isVerified: true,  // Auto-verify via invitation
    isActive: true,
  })

  // 6. Assign role
  await UserRole.query().insert({
    userId: user.id,
    roleId: invitation.roleId,
  })

  // 7. Assign tenant
  await UserTenant.query().insert({
    userId: user.id,
    tenantId: invitation.tenantId,
    isPrimary: true,
  })

  // 8. Mark invitation as accepted
  await invitation.$query().patch({
    acceptedAt: moment().toDate(),
  })

  // 9. Generate tokens
  const { accessToken, refreshToken } = await signTokens(user)

  return { user, accessToken, refreshToken }
}
```

## Security Considerations

### Token Security

```typescript
// Tokens are hashed before storage
const plainToken = randomBytes(32).toString('hex')  // 64 chars
const tokenHash = createHash('sha256').update(plainToken).digest('hex')

// Only hash is stored in database
// Plain token sent via email (one-time use)
```

### Expiration

```typescript
// Invitations expire after 7 days (configurable)
const expiresAt = moment()
  .add(SECURITY_RULES.INVITATION_EXPIRY_DAYS, 'days')
  .toDate()

// Expired invitations cannot be accepted
.where('expires_at', '>', new Date())
```

### One-Time Use

```typescript
// Invitations can only be accepted once
.whereNull('accepted_at')

// After acceptance, invitation is marked
await invitation.$query().patch({
  acceptedAt: moment().toDate(),
})
```

### Email Validation

```typescript
// Check if user already exists
const existingUser = await User.findByEmail(data.email)
if (existingUser) {
  throw new ApiError(HTTP_STATUS.CONFLICT, 'User already exists')
}
```

## Email Template

### Template Location
`public/templates/invitation.html`

### Template Variables

```typescript
{
  acceptUrl: string        // Full URL to accept invitation
  tenantName: string       // Name of tenant
  expiryDays: number      // Days until expiration
}
```

### Example Email

```
Subject: You have been invited to join Acme Corp

Hello,

You have been invited to join Acme Corp on Bkeep.

Click the link below to accept your invitation:
https://app.bkeep.ca/accept-invitation?token=abc123...

This invitation will expire in 7 days.

If you didn't request this invitation, you can safely ignore this email.
```

## Best Practices

### 1. Always Queue Emails

```typescript
// ✅ Good - Queue email (non-blocking)
try {
  await queueUserInvitationEmail({ ... })
} catch (error) {
  logger.error('Failed to queue email', { error })
}

// ❌ Bad - Send synchronously (blocks request)
await sendMail({ ... })
```

### 2. Handle Duplicates

```typescript
// Check for existing invitation
const existing = await UserInvitation.query()
  .modify('notDeleted')
  .where('email', email)
  .where('tenant_id', tenantId)
  .where('expires_at', '>', new Date())
  .first()

if (existing) {
  throw new ApiError(HTTP_STATUS.CONFLICT, 'Invitation already exists')
}
```

### 3. Validate Tenant Access

```typescript
// Controller automatically uses user's selected tenant
export const inviteUser: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user
    if (!user?.selectedTenantId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED
      )
    }
    
    // Use tenantId directly from JWT (no tenant context middleware needed)
    const tenantId = user.selectedTenantId
    
    const invitationData: CreateUserInvitationData = {
      email,
      roleId,
      tenantId,  // From JWT
      invitedBy: user.id,
    }
    
    // ...
  }
)
```

### 4. Clean Up Expired Invitations

```typescript
// Periodic cleanup job (cron)
export const cleanupExpiredInvitations = async (): Promise<number> => {
  const expired = await UserInvitation.query()
    .where('expires_at', '<=', new Date())
    .whereNull('accepted_at')
    .modify('notDeleted')
    .delete()

  return expired
}
```

## Troubleshooting

### Invitation Not Received

**Check:**
1. Email was queued successfully (check logs)
2. Mail worker is running
3. Email address is correct
4. Check spam folder

**Solution:**
- Resend invitation (revoke old, create new)
- Check mail queue status
- Verify email service configuration

### Token Invalid or Expired

```
Error: Invalid or expired invitation token
```

**Causes:**
- Token has expired (7 days)
- Token already used
- Token is incorrect

**Solution:**
- Request new invitation
- Check expiration date
- Verify token in URL matches email

### User Already Exists

```
Error: User already exists
```

**Causes:**
- User account already created
- Email already registered

**Solution:**
- User should login instead
- Check if user needs to be added to tenant
- Use different email address

## Related Documentation

- [Authentication](./AUTHENTICATION.md)
- [User Management](./USER_MANAGEMENT.md)
- [Mail Queue](./MAIL_QUEUE.md)
- [Multi-Tenancy](./MULTI_TENANCY.md)

