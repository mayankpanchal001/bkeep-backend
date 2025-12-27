# API Architecture

## Overview

Bkeep is a **multi-tenant TypeScript/Express backend** for bookkeeping and accounting management. It uses **PostgreSQL** for data storage, **Redis** for caching and queues, and follows a **clean architecture** pattern with clear separation of concerns.

## Technology Stack

### Core
- **Node.js** 18+ - Runtime environment
- **TypeScript** 5+ - Type-safe development
- **Express** 4.18+ - Web framework
- **Objection.js** 3.1+ - ORM (built on Knex.js)
- **Knex.js** 3.1+ - SQL query builder

### Database & Caching
- **PostgreSQL** 15+ - Primary database
- **Redis** 7+ - Caching & job queue

### Authentication & Security
- **JWT** (jsonwebtoken) - Authentication tokens
- **bcrypt** - Password hashing
- **express-rate-limit** - Rate limiting
- **helmet** - Security headers
- **otplib** - TOTP generation/verification
- **qrcode** - QR code generation for TOTP

### Email & Queue
- **BullMQ** - Job queue management
- **AWS SES** (@aws-sdk/client-ses) - Email delivery
- **Handlebars** - Email template rendering

### Validation & Documentation
- **Zod** - Request validation
- **Swagger/OpenAPI** - API documentation

### Development & Testing
- **Jest** - Testing framework
- **ts-node** - TypeScript execution
- **nodemon** - Development server
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Project Structure

```
ts-backend/
├── docs/                           # Documentation
│   ├── README.md                   # Docs index
│   ├── API_ARCHITECTURE.md         # This file
│   ├── MULTI_TENANCY.md            # Multi-tenancy guide
│   ├── ROLE_MANAGEMENT.md          # Role & permission management
│   ├── TOTP_IMPLEMENTATION.md      # TOTP authentication
│   └── MAIL_QUEUE.md               # Email service
│
├── public/                         # Static files
│   └── templates/                  # Email templates (Handlebars)
│
├── src/                            # Source code
│   ├── app.ts                      # Express app setup
│   ├── server.ts                   # Server entry point
│   │
│   ├── config/                     # Configuration
│   │   ├── env.ts                  # Environment variables
│   │   ├── knexfile.ts             # Database configuration
│   │   ├── logger.ts               # Winston logger
│   │   ├── redis.ts                # Redis connection
│   │   └── swagger.ts              # Swagger/OpenAPI setup
│   │
│   ├── constants/                  # Application constants
│   │   ├── errors.ts               # Error messages
│   │   ├── success.ts              # Success messages
│   │   ├── http.ts                 # HTTP status codes
│   │   ├── roles.ts                # Role names
│   │   ├── security.ts             # Security rules (MFA, TOTP)
│   │   ├── validation.ts           # Validation rules
│   │   ├── pagination.ts           # Pagination defaults
│   │   ├── rateLimit.ts            # Rate limit configs
│   │   └── mail.ts                 # Email constants
│   │
│   ├── controllers/                # Request handlers
│   │   ├── auth.controller.ts      # Authentication
│   │   ├── user.controller.ts      # User management
│   │   ├── role.controller.ts      # Role management
│   │   ├── tenant.controller.ts    # Tenant management
│   │   ├── account.controller.ts   # Bookkeeping accounts
│   │   ├── userInvitation.controller.ts  # User invitations
│   │   └── health.controller.ts    # Health check
│   │
│   ├── database/                   # Database files
│   │   ├── connection.ts           # Knex instance
│   │   ├── migrations/             # Schema migrations
│   │   │   ├── *.ts                # Global migrations
│   │   │   └── tenant/             # Tenant-specific migrations
│   │   ├── seeds/                  # Database seeders
│   │   │   ├── seed_permissions.ts
│   │   │   ├── seed_roles.ts
│   │   │   └── seed_users.ts
│   │   └── data/                   # Seed data (JSON)
│   │       ├── permissions.json
│   │       ├── roles.json
│   │       └── users.json
│   │
│   ├── middlewares/                # Express middlewares
│   │   ├── auth.middleware.ts      # Authentication & authorization
│   │   ├── errorHandler.middleware.ts  # Global error handler
│   │   ├── validate.middleware.ts  # Zod validation
│   │   ├── rateLimit.middleware.ts # Rate limiting
│   │   ├── tenantContext.middleware.ts  # Tenant context
│   │   ├── session.middleware.ts   # Session management
│   │   ├── request.middleware.ts   # Request logging
│   │   ├── helmet.middleware.ts    # Security headers
│   │   └── notFoundHandler.middleware.ts  # 404 handler
│   │
│   ├── models/                     # Objection.js models
│   │   ├── BaseModel.ts            # Base model (UUID, timestamps, soft delete)
│   │   ├── User.ts                 # User model
│   │   ├── Tenant.ts               # Tenant model
│   │   ├── Role.ts                 # Role model
│   │   ├── Permission.ts           # Permission model
│   │   ├── Account.ts              # Bookkeeping account model
│   │   ├── RefreshToken.ts         # Refresh token model
│   │   ├── PasswordReset.ts        # Password reset token model
│   │   ├── UserInvitation.ts       # User invitation model
│   │   ├── MfaEmailOtp.ts          # Email OTP model
│   │   ├── UserAuthenticator.ts    # TOTP authenticator model
│   │   └── index.ts                # Model exports
│   │
│   ├── queries/                    # Database queries
│   │   ├── user.queries.ts         # User queries
│   │   ├── tenant.queries.ts       # Tenant queries
│   │   ├── role.queries.ts         # Role queries
│   │   ├── account.queries.ts      # Account queries
│   │   ├── refreshToken.queries.ts # Token queries
│   │   ├── passwordReset.queries.ts  # Password reset queries
│   │   ├── userInvitation.queries.ts  # Invitation queries
│   │   └── mfa.queries.ts          # MFA queries
│   │
│   ├── queues/                     # BullMQ queue definitions
│   │   └── mail.queue.ts           # Mail queue
│   │
│   ├── routes/                     # API routes
│   │   ├── index.ts                # Route aggregator
│   │   ├── auth.route.ts           # /auth routes
│   │   ├── user.route.ts           # /users routes
│   │   ├── role.route.ts           # /roles routes
│   │   ├── tenant.route.ts         # /tenants routes
│   │   ├── account.route.ts        # /accounts routes
│   │   └── health.route.ts         # /health route
│   │
│   ├── schema/                     # Zod validation schemas
│   │   ├── auth.schema.ts          # Auth schemas
│   │   ├── user.schema.ts          # User schemas
│   │   ├── role.schema.ts          # Role schemas
│   │   ├── tenant.schema.ts        # Tenant schemas
│   │   ├── account.schema.ts       # Account schemas
│   │   └── shared.schema.ts        # Shared schemas (pagination)
│   │
│   ├── services/                   # Business logic services
│   │   ├── mail.service.ts         # AWS SES mail service
│   │   ├── mailQueue.service.ts    # Mail queue helpers
│   │   └── tenant.service.ts       # Tenant onboarding
│   │
│   ├── types/                      # TypeScript type definitions
│   │   ├── index.ts                # Type exports
│   │   ├── auth.type.ts            # Auth types
│   │   ├── user.type.ts            # User types
│   │   ├── tenant.type.ts          # Tenant types
│   │   ├── jwt.type.ts             # JWT types
│   │   ├── mail.type.ts            # Mail types
│   │   ├── session.type.ts         # Session types
│   │   ├── api.type.ts             # API types
│   │   ├── errors.type.ts          # Error types
│   │   └── z.type.ts               # Zod types
│   │
│   ├── utils/                      # Utility functions
│   │   ├── ApiError.ts             # API error class
│   │   ├── ApiResponse.ts          # API response class
│   │   ├── asyncHandler.ts         # Async error handler
│   │   ├── jwt.ts                  # JWT utilities
│   │   ├── totp.ts                 # TOTP utilities
│   │   ├── mailTemplate.ts         # Template renderer
│   │   └── tenantQuery.ts          # Tenant query helpers
│   │
│   ├── workers/                    # Background workers
│   │   └── mail.worker.ts          # Mail queue worker
│   │
│   └── tests/                      # Test files
│       ├── setup.ts                # Test setup
│       ├── __mocks__/              # Test mocks
│       └── *.test.ts               # Test files
│
├── .env                            # Environment variables (git ignored)
├── .env.example                    # Environment template
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── jest.config.ts                  # Jest config
└── eslint.config.mts               # ESLint config
```

## Architecture Patterns

### 1. Layered Architecture

```
Request
  ↓
Route (API endpoints)
  ↓
Middleware (auth, validation)
  ↓
Controller (request handling)
  ↓
Query (database operations)
  ↓
Model (data structure)
  ↓
Database
```

### 2. Separation of Concerns

**Routes** → Define endpoints
```typescript
router.post('/users', authenticate, validate(userSchema), createUser)
```

**Controllers** → Handle HTTP requests/responses
```typescript
export const createUser = asyncHandler(async (req, res) => {
  const user = await createUserQuery(req.body)
  res.json(new ApiResponse(HTTP_STATUS.CREATED, 'User created', user))
})
```

**Queries** → Database operations
```typescript
export const createUserQuery = async (data: CreateUserData): Promise<User> => {
  return await User.query().insert(data)
}
```

**Models** → Data structure & validation
```typescript
export class User extends BaseModel {
  static tableName = 'users'
  static jsonSchema = { /* validation */ }
}
```

### 3. Error Handling

Global error handler catches all errors:

```typescript
// Throw errors anywhere
throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found')

// Automatically formatted as:
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "data": null
}
```

### 4. Response Format

Consistent API responses:

```typescript
// Success
new ApiResponse(statusCode, message, data)

// Returns:
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { /* ... */ }
}
```

## Key Features

### 1. Multi-Tenancy
- Schema-based isolation
- Tenant-specific data
- Cross-tenant admin access
- See: [MULTI_TENANCY.md](./MULTI_TENANCY.md)

### 2. Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Permission-based authorization
- MFA (Email OTP + TOTP)
- See: [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md), [TOTP_IMPLEMENTATION.md](./TOTP_IMPLEMENTATION.md)

### 3. User Management
- User CRUD operations
- User invitations
- Role assignment
- Activation/deactivation

### 4. Email System
- Queue-based email delivery
- AWS SES integration
- Template rendering
- Retry logic
- See: [MAIL_QUEUE.md](./MAIL_QUEUE.md)

### 5. Security
- Password hashing (bcrypt)
- JWT tokens (access + refresh)
- Rate limiting
- Security headers (Helmet)
- CORS configuration
- Input validation (Zod)

## API Endpoints

### Authentication (`/api/v1/auth`)
```
POST   /login                    # Login
POST   /logout                   # Logout
POST   /refresh-token            # Refresh token
POST   /forgot-password          # Request password reset
POST   /reset-password           # Reset password
POST   /accept-invitation        # Accept user invitation
GET    /me                       # Get current user
POST   /mfa/enable               # Enable email OTP
POST   /mfa/disable              # Disable email OTP
POST   /mfa/verify               # Verify email OTP
POST   /totp/setup               # Setup TOTP
POST   /totp/verify              # Verify & enable TOTP
POST   /totp/disable             # Disable TOTP
POST   /totp/login               # TOTP login
POST   /totp/backup-codes        # Regenerate backup codes
```

### Users (`/api/v1/users`)
```
GET    /                         # List users
GET    /statistics               # User statistics
GET    /:id                      # Get user
PUT    /profile                  # Update current user profile
DELETE /:id                      # Delete user
PATCH  /:id/activation           # Activate/deactivate
PATCH  /:id/restore              # Restore deleted user
PUT    /:id/roles                # Update user roles
GET    /invitations              # List pending invitations
POST   /invitation               # Invite user
DELETE /invitations/:invitationId # Revoke invitation
POST   /invitations/:invitationId/resend # Resend invitation
```

### Roles (`/api/v1/roles`)
```
GET    /                         # List roles
GET    /statistics               # Role statistics
GET    /:id                      # Get role
GET    /:id/with-permissions     # Get role with permissions
PUT    /:id/permissions          # Update role permissions
```

### Tenants (`/api/v1/tenants`)
```
GET    /                         # List tenants
GET    /:id                      # Get tenant
POST   /                         # Create tenant (onboard)
PATCH  /:id                      # Update tenant
DELETE /:id                      # Delete tenant
PATCH  /:id/restore              # Restore tenant
```

### Accounts (`/api/v1/accounts`)
```
GET    /                         # List accounts (tenant-specific)
GET    /:id                      # Get account
POST   /                         # Create account
PUT    /:id                      # Update account
DELETE /:id                      # Delete account
PATCH  /:id/restore              # Restore account
PATCH  /:id/activation           # Activate/deactivate
```

### Audit Logs (`/api/v1/audit-logs`)
```
GET    /                         # List audit logs (with filters)
GET    /:id                      # Get audit log by ID
GET    /target/:targetType/:targetId  # Get logs by target entity
GET    /actor/:actorType/:actorId     # Get logs by actor
```

### Health (`/api/v1/health`)
```
GET    /                         # Health check
```

## Database Schema

### Global Tables (public schema)
- `tenants` - Tenant information
- `users` - User accounts
- `roles` - Role definitions
- `permissions` - Permission definitions
- `user_roles` - User-role relationships
- `role_permissions` - Role-permission relationships
- `user_tenants` - User-tenant relationships
- `refresh_tokens` - JWT refresh tokens
- `password_resets` - Password reset tokens
- `user_invitations` - User invitation tokens
- `mfa_email_otps` - Email OTP codes
- `user_authenticators` - TOTP authenticators
- `audit_logs` - Audit trail entries

### Tenant Tables (tenant_* schemas)
- `accounts` - Bookkeeping accounts
- (Future: transactions, invoices, reports, etc.)

## Security Best Practices

### 1. Authentication
- JWT with short expiry (1 day)
- Refresh tokens with longer expiry (7 days)
- Secure token storage
- Token rotation on refresh

### 2. Authorization
- Role-based access control
- Permission-based authorization
- Tenant context validation
- Admin-only routes protected

### 3. Input Validation
- Zod schemas for all inputs
- SQL injection prevention (Knex)
- XSS prevention (sanitization)
- Rate limiting

### 4. Password Security
- bcrypt hashing (10 rounds)
- Password strength requirements
- Password reset tokens (24h expiry)
- MFA support (Email OTP + TOTP)

### 5. Data Protection
- Soft deletes (never hard delete)
- Audit logging
- Sensitive data encryption
- HTTPS only (production)

## Development Workflow

### Setup
```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development server
pnpm dev

# Start mail worker
pnpm worker:mail
```

### Scripts
```json
{
  "dev": "nodemon src/server.ts",
  "build": "tsc && tsc-alias",
  "start": "node dist/server.js",
  "test": "jest",
  "db:migrate": "knex migrate:latest",
  "db:migrate:rollback": "knex migrate:rollback",
  "db:seed": "knex seed:run",
  "worker:mail": "ts-node src/workers/mail.worker.ts"
}
```

## Deployment

### Environment Variables
See `.env.example` for required variables

### Database
1. Create PostgreSQL database
2. Run migrations: `pnpm db:migrate`
3. Seed initial data: `pnpm db:seed`

### Application
1. Build: `pnpm build`
2. Start: `pnpm start`

### Worker
1. Start mail worker: `pnpm worker:mail`
2. Or use PM2: `pm2 start dist/workers/mail.worker.js`

### Monitoring
- Health check: `GET /api/v1/health`
- Logs: Winston logger (file + console)
- Queue: BullMQ dashboard

## Related Documentation

- [Multi-Tenancy](./MULTI_TENANCY.md)
- [Role Management](./ROLE_MANAGEMENT.md)
- [TOTP Implementation](./TOTP_IMPLEMENTATION.md)
- [Mail Queue](./MAIL_QUEUE.md)
- [Audit Logging](./AUDIT_LOGGING.md)
- [Database Schema - MFA](./DATABASE_SCHEMA_MFA.md)

