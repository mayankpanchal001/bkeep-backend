# Audit Logging

## Overview

The Bkeep backend includes a comprehensive audit logging system that tracks all system operations for compliance, security, and debugging purposes. The audit system uses an event-sourcing pattern with JSONB storage for flexibility and efficient querying.

## Table of Contents

- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Audit Service](#audit-service)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Querying Audit Logs](#querying-audit-logs)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)

## Architecture

### Design Principles

1. **Immutable Logs**: Audit logs are never modified or deleted once created
2. **Event-Sourcing Pattern**: Each log entry represents a discrete event
3. **JSONB Storage**: Flexible JSONB columns for actor, targets, and context
4. **Tenant Isolation**: All logs are associated with a tenant ID
5. **Comprehensive Context**: Captures who, what, when, where, and why

### Components

- **AuditLog Model** (`src/models/AuditLog.ts`): Objection.js model for audit log entries
- **Audit Service** (`src/services/audit.service.ts`): Helper functions for creating audit logs
- **Audit Queries** (`src/queries/audit.queries.ts`): Database query functions
- **Audit Controller** (`src/controllers/audit.controller.ts`): HTTP request handlers
- **Audit Routes** (`src/routes/audit.route.ts`): API endpoint definitions

## Database Schema

### Table Structure

The `audit_logs` table is stored in the global `public` schema:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  action VARCHAR(100) NOT NULL,           -- Namespaced action (e.g., 'user.logged_in')
  actor JSONB NOT NULL,                   -- Who performed the action
  targets JSONB NOT NULL,                 -- What was affected (array)
  tenant_id UUID NOT NULL,                -- Tenant context
  context JSONB NOT NULL,                 -- Request metadata
  success BOOLEAN NOT NULL DEFAULT true,   -- Whether action succeeded
  occurred_at TIMESTAMP NOT NULL,        -- When the action occurred
  created_at TIMESTAMP NOT NULL           -- When the log was created
);
```

### Indexes

- `idx_audit_logs_action` - Index on action column
- `idx_audit_logs_tenant_id` - Index on tenant_id column
- `idx_audit_logs_occurred_at` - Index on occurred_at column
- `idx_audit_logs_success` - Index on success column
- `idx_audit_logs_tenant_occurred` - Composite index on (tenant_id, occurred_at)
- `idx_audit_logs_action_occurred` - Composite index on (action, occurred_at)
- `idx_audit_logs_actor_gin` - GIN index on actor JSONB column
- `idx_audit_logs_targets_gin` - GIN index on targets JSONB column
- `idx_audit_logs_context_gin` - GIN index on context JSONB column

### JSONB Structure

#### Actor (Who)

```typescript
{
  type: 'user' | 'system' | 'api_key',
  id: string,
  email?: string,    // For user actors
  name?: string      // For user actors
}
```

**Example:**
```json
{
  "type": "user",
  "id": "user_01GBNJC3MX9ZZJW1FSTF4C5938",
  "email": "john@example.com",
  "name": "John Doe"
}
```

#### Targets (What)

Array of affected entities:

```typescript
[
  {
    type: string,      // Entity type (e.g., 'User', 'Account', 'Tenant')
    id: string,        // Entity ID
    changes?: {        // For update actions
      from: unknown,
      to: unknown
    },
    [key: string]: unknown  // Additional metadata
  }
]
```

**Example:**
```json
[
  {
    "type": "User",
    "id": "user_01GBNJD4MKHVKJGEWK42JNMBGS",
    "changes": {
      "isActive": {
        "from": false,
        "to": true
      }
    }
  }
]
```

#### Context (Where/How)

Request metadata:

```typescript
{
  location?: string,      // IP address
  userAgent?: string,      // Browser/client info
  method?: string,         // HTTP method
  endpoint?: string,       // API endpoint
  requestId?: string,      // Request ID for tracing
  sessionId?: string       // Session ID
}
```

**Example:**
```json
{
  "location": "123.123.123.123",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "method": "POST",
  "endpoint": "/api/v1/auth/login",
  "requestId": "req_abc123"
}
```

## Audit Service

The audit service provides helper functions for creating audit logs:

### Core Functions

#### `createAuditLog(options)`

Creates a raw audit log entry:

```typescript
import { createAuditLog } from '@services/audit.service'

await createAuditLog({
  action: 'user.logged_in',
  actor: {
    type: 'user',
    id: userId,
    email: user.email,
    name: user.name
  },
  targets: [
    { type: 'Tenant', id: tenantId }
  ],
  tenantId: tenantId,
  context: {
    location: ipAddress,
    userAgent: userAgent,
    method: 'POST',
    endpoint: '/api/v1/auth/login'
  },
  success: true,
  trx: transaction  // Optional: for transaction support
})
```

#### `auditCreate(action, targetType, targetId, options)`

Helper for creation events:

```typescript
import { auditCreate, extractRequestContext } from '@services/audit.service'

await auditCreate(
  'account.created',
  'Account',
  accountId,
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId,
    metadata: { name: account.name }
  }
)
```

#### `auditUpdate(action, targetType, targetId, changes, options)`

Helper for update events:

```typescript
import { auditUpdate } from '@services/audit.service'

await auditUpdate(
  'user.updated',
  'User',
  userId,
  {
    isActive: { from: false, to: true }
  },
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId
  }
)
```

#### `auditDelete(action, targetType, targetId, options)`

Helper for deletion events:

```typescript
import { auditDelete } from '@services/audit.service'

await auditDelete(
  'account.deleted',
  'Account',
  accountId,
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId
  }
)
```

#### `auditAction(action, targets, options)`

Helper for custom actions:

```typescript
import { auditAction } from '@services/audit.service'

await auditAction(
  'user.logged_in',
  [
    { type: 'Tenant', id: tenantId }
  ],
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId,
    context: {
      location: ipAddress,
      userAgent: userAgent
    }
  }
)
```

### Request Context Extraction

The `extractRequestContext` function automatically extracts context from Express requests:

```typescript
import { extractRequestContext } from '@services/audit.service'

const requestContext = extractRequestContext(req)
// Returns:
// {
//   user: JwtUser | undefined,
//   ipAddress: string | null,
//   userAgent: string | null,
//   method: string | null,
//   endpoint: string | null,
//   tenantId: string | null,
//   requestId: string | null
// }
```

## API Endpoints

All audit log endpoints require authentication and Admin or SuperAdmin role.

### Base Path

```
/api/v1/audit-logs
```

### Get All Audit Logs

**GET** `/api/v1/audit-logs`

Retrieves audit logs with pagination, sorting, and filtering.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `sort` (string, default: 'occurredAt') - Sort field: `occurredAt`, `createdAt`, `action`
- `order` (string, default: 'desc') - Sort order: `asc`, `desc`
- `action` (string) - Filter by action (e.g., `user.logged_in`)
- `actorType` (string) - Filter by actor type: `user`, `system`, `api_key`
- `actorId` (string, UUID) - Filter by actor ID
- `targetType` (string) - Filter by target entity type
- `targetId` (string, UUID) - Filter by target entity ID
- `tenantId` (string, UUID) - Filter by tenant ID
- `success` (boolean) - Filter by success status
- `startDate` (string, ISO 8601) - Filter by start date
- `endDate` (string, ISO 8601) - Filter by end date

**Authorization:**
- SuperAdmin: Can see all logs across all tenants
- Admin: Can only see logs from their own tenant

**Example Request:**
```bash
GET /api/v1/audit-logs?page=1&limit=20&action=user.logged_in&startDate=2025-01-01T00:00:00Z
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Audit logs retrieved successfully",
  "data": {
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "action": "user.logged_in",
        "actor": {
          "type": "user",
          "id": "user_01GBNJC3MX9ZZJW1FSTF4C5938",
          "email": "john@example.com",
          "name": "John Doe"
        },
        "targets": [
          {
            "type": "Tenant",
            "id": "123e4567-e89b-12d3-a456-426614174001"
          }
        ],
        "tenantId": "123e4567-e89b-12d3-a456-426614174001",
        "context": {
          "location": "123.123.123.123",
          "userAgent": "Mozilla/5.0...",
          "method": "POST",
          "endpoint": "/api/v1/auth/login"
        },
        "success": true,
        "occurredAt": "2025-01-15T10:30:00.000Z",
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "offset": 0,
      "total": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

### Get Audit Log by ID

**GET** `/api/v1/audit-logs/:id`

Retrieves a specific audit log by its ID.

**Parameters:**
- `id` (string, UUID) - Audit log ID

**Example Request:**
```bash
GET /api/v1/audit-logs/123e4567-e89b-12d3-a456-426614174000
```

### Get Audit Logs by Target

**GET** `/api/v1/audit-logs/target/:targetType/:targetId`

Retrieves audit logs for a specific target entity.

**Parameters:**
- `targetType` (string) - Target entity type (e.g., `User`, `Account`)
- `targetId` (string, UUID) - Target entity ID

**Query Parameters:**
- `limit` (number, default: 50, max: 100) - Maximum number of logs to return

**Example Request:**
```bash
GET /api/v1/audit-logs/target/User/user_01GBNJD4MKHVKJGEWK42JNMBGS?limit=50
```

### Get Audit Logs by Actor

**GET** `/api/v1/audit-logs/actor/:actorType/:actorId`

Retrieves audit logs for a specific actor.

**Parameters:**
- `actorType` (string) - Actor type: `user`, `system`, `api_key`
- `actorId` (string, UUID) - Actor ID

**Query Parameters:**
- `limit` (number, default: 50, max: 100) - Maximum number of logs to return

**Example Request:**
```bash
GET /api/v1/audit-logs/actor/user/user_01GBNJC3MX9ZZJW1FSTF4C5938?limit=50
```

## Usage Examples

### Logging User Login

```typescript
import { auditAction, extractRequestContext } from '@services/audit.service'

// In auth controller
await auditAction(
  'user.logged_in',
  [{ type: 'Tenant', id: tenantId }],
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId
  }
)
```

### Logging Account Creation

```typescript
import { auditCreate, extractRequestContext } from '@services/audit.service'

// In account controller
const account = await createAccount(tenantId, schemaName, userId, accountData)

await auditCreate(
  'account.created',
  'Account',
  account.id,
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId,
    metadata: {
      name: account.name,
      currencyCode: account.currencyCode
    }
  }
)
```

### Logging User Update with Changes

```typescript
import { auditUpdate, extractRequestContext } from '@services/audit.service'

// In user controller
const changes = {
  isActive: { from: user.isActive, to: true },
  email: { from: user.email, to: newEmail }
}

await auditUpdate(
  'user.updated',
  'User',
  userId,
  changes,
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId
  }
)
```

### Logging Failed Operations

```typescript
import { auditAction, extractRequestContext } from '@services/audit.service'

try {
  await performOperation()
  await auditAction(
    'operation.succeeded',
    [{ type: 'Resource', id: resourceId }],
    {
      requestContext: extractRequestContext(req),
      tenantId: tenantId,
      success: true
    }
  )
} catch (error) {
  await auditAction(
    'operation.failed',
    [{ type: 'Resource', id: resourceId }],
    {
      requestContext: extractRequestContext(req),
      tenantId: tenantId,
      success: false,
      context: {
        error: error.message
      }
    }
  )
  throw error
}
```

## Querying Audit Logs

### Using Query Functions

```typescript
import {
  findAuditLogs,
  findAuditLogsByTarget,
  findAuditLogsByActor,
  findAuditLogById
} from '@queries/audit.queries'

// Find logs with filters
const { logs, total } = await findAuditLogs({
  page: 1,
  limit: 20,
  action: 'user.logged_in',
  tenantId: tenantId,
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  sort: 'occurredAt',
  order: 'desc'
})

// Find logs for a specific target
const targetLogs = await findAuditLogsByTarget('User', userId, 50)

// Find logs for a specific actor
const actorLogs = await findAuditLogsByActor('user', userId, 50)

// Find specific log
const log = await findAuditLogById(logId)
```

### Using Model Directly

```typescript
import { AuditLog } from '@models/AuditLog'

// Query with modifiers
const logs = await AuditLog.query()
  .modify('byAction', 'user.logged_in')
  .modify('byTenantId', tenantId)
  .modify('bySuccess', true)
  .modify('newestFirst')
  .limit(20)
```

## Audit Actions

### Predefined Actions

Actions use a namespaced string format (e.g., `user.logged_in`, `tenant.created`).

**Tenant Actions:**
- `tenant.created` - Tenant created
- `tenant.updated` - Tenant updated
- `tenant.deleted` - Tenant deleted
- `tenant.restored` - Tenant restored
- `tenant.switched` - Tenant switched

**User Actions:**
- `user.deleted` - User deleted
- `user.activated` - User activated
- `user.deactivated` - User deactivated
- `user.logged_in` - User logged in
- `user.logged_out` - User logged out

**Account Actions:**
- `account.created` - Account created
- `account.updated` - Account updated
- `account.deleted` - Account deleted
- `account.restored` - Account restored
- `account.activated` - Account activated
- `account.deactivated` - Account deactivated

### Custom Actions

You can use any namespaced string format for custom actions:

```typescript
await auditAction(
  'custom.feature.action',
  targets,
  options
)
```

## Best Practices

### 1. Always Log Important Operations

Log all create, update, delete, and sensitive operations:

```typescript
// ✅ Good: Logs account creation
await createAccount(data)
await auditCreate('account.created', 'Account', account.id, options)

// ❌ Bad: Missing audit log
await createAccount(data)
```

### 2. Include Request Context

Always use `extractRequestContext` when available:

```typescript
// ✅ Good: Includes full context
await auditAction(
  'user.logged_in',
  targets,
  {
    requestContext: extractRequestContext(req),
    tenantId: tenantId
  }
)

// ❌ Bad: Missing context
await auditAction(
  'user.logged_in',
  targets,
  { tenantId: tenantId }
)
```

### 3. Log Both Success and Failure

Log both successful and failed operations:

```typescript
try {
  await performOperation()
  await auditAction('operation.succeeded', targets, { ...options, success: true })
} catch (error) {
  await auditAction('operation.failed', targets, { ...options, success: false })
  throw error
}
```

### 4. Use Appropriate Helper Functions

Use the right helper function for the operation type:

```typescript
// ✅ Good: Uses auditCreate for creation
await auditCreate('account.created', 'Account', account.id, options)

// ❌ Bad: Uses generic auditAction
await auditAction('account.created', [{ type: 'Account', id: account.id }], options)
```

### 5. Include Relevant Metadata

Add metadata to targets for better traceability:

```typescript
await auditCreate(
  'account.created',
  'Account',
  account.id,
  {
    ...options,
    metadata: {
      name: account.name,
      currencyCode: account.currencyCode
    }
  }
)
```

### 6. Use Transactions When Needed

Include transaction support for atomic operations:

```typescript
await trx.transaction(async (trx) => {
  const account = await createAccount(data, trx)
  await auditCreate(
    'account.created',
    'Account',
    account.id,
    { ...options, trx }
  )
})
```

## Security Considerations

### 1. Access Control

- Only Admin and SuperAdmin roles can access audit logs
- SuperAdmin can see all logs across all tenants
- Admin can only see logs from their own tenant

### 2. Immutability

- Audit logs are never modified or deleted
- This ensures an accurate audit trail for compliance

### 3. Sensitive Data

- Be careful not to log sensitive information (passwords, tokens, etc.)
- Use metadata fields judiciously

### 4. Performance

- Audit logging is asynchronous and should not block operations
- Use transactions when logging is critical
- Consider batching for high-volume operations

### 5. Retention

- Consider implementing log retention policies
- Archive old logs if needed for compliance
- Monitor log table size

## Related Documentation

- [API Architecture](./API_ARCHITECTURE.md) - Overall system architecture
- [Multi-Tenancy](./MULTI_TENANCY.md) - Tenant isolation
- [Role Management](./ROLE_MANAGEMENT.md) - Access control

---

**Last Updated:** November 26, 2025  
**Documentation Version:** 1.0

