# Multi-Tenancy Architecture

## Overview

Bkeep uses a **schema-based multi-tenancy** approach where each tenant gets their own PostgreSQL schema. This provides strong data isolation while sharing the same database instance.

## Architecture

### Database Structure

```
PostgreSQL Database
├── public schema (global data)
│   ├── tenants
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── user_roles
│   ├── role_permissions
│   ├── user_tenants
│   ├── password_resets
│   ├── refresh_tokens
│   ├── user_invitations
│   ├── mfa_email_otps
│   └── user_authenticators
│
└── tenant_<uuid> schemas (tenant-specific data)
    └── accounts (bookkeeping accounts per tenant)
```

### Schema Separation

**Public Schema (Global Data):**
- User accounts
- Tenant information
- Roles & permissions
- Authentication data (tokens, MFA)
- User invitations

**Tenant Schemas (Isolated Data):**
- Bookkeeping accounts
- Transactions (future)
- Invoices (future)
- Reports (future)

## When to Use Tenant Context vs Direct Tenant ID

### Use `getTenantContext()` (with `setTenantContext` middleware) when:
- ✅ You need **schema name** for tenant-specific database queries
- ✅ Example: Account APIs (accounts are stored in tenant-specific schemas)
- ✅ Route requires: `setTenantContext` + `requireTenantContext` middleware

### Use `req.user?.selectedTenantId` directly when:
- ✅ You only need **tenant ID** for filtering public schema data
- ✅ Example: User invitations, audit logs, user management
- ✅ Route requires: Only `authenticate` middleware (no tenant context middleware)

### Decision Matrix

| Feature | Needs Schema Name? | Approach | Middleware |
|---------|-------------------|----------|------------|
| Accounts | ✅ Yes | `getTenantContext()` | `setTenantContext` + `requireTenantContext` |
| User Invitations | ❌ No | `req.user?.selectedTenantId` | `authenticate` only |
| Audit Logs | ❌ No | `req.user?.selectedTenantId` | `authenticate` only |
| User Management | ❌ No | `req.user?.selectedTenantId` | `authenticate` only |
| Tenant Management | ❌ No | `req.user?.selectedTenantId` | `authenticate` only |

## Key Components

### 1. Tenant Model

```typescript
// Location: src/models/Tenant.ts
export class Tenant extends BaseModel {
  id: string              // UUID
  name: string            // Tenant name
  email: string           // Tenant email
  phone?: string          // Contact phone
  address?: string        // Physical address
  city?: string
  state?: string
  postalCode?: string
  country?: string
  website?: string
  schemaName: string      // PostgreSQL schema name (tenant_<uuid>)
  isActive: boolean       // Active status
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```

### 2. Tenant Context Middleware

```typescript
// Location: src/middlewares/tenantContext.middleware.ts

// Only use when schema name is required (e.g., for account APIs)
// For most operations, use req.user.selectedTenantId directly

// setTenantContext - Fetches tenant from DB and sets context with schema name
export const setTenantContext = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Extract tenant ID from JWT token (req.user.selectedTenantId)
  // 2. Fetch tenant from database
  // 3. Validate tenant exists and is active
  // 4. Set req.tenantContext with tenantId, tenantName, and schemaName
  // 5. Continue to next middleware
}

// getTenantContext - Helper to extract tenant context
// Only use when you need schemaName (e.g., for tenant-specific queries)
export const getTenantContext = (req: TenantRequest): TenantContext | undefined => {
  return req.tenantContext
}
```

### 3. Tenant Query Utilities

```typescript
// Location: src/utils/tenantQuery.ts

// Get tenant-specific schema name
export const getTenantSchemaName = (tenantId: string): string => {
  return `tenant_${tenantId.replace(/-/g, '_')}`
}

// Get Knex instance for tenant schema
export const getTenantKnex = (schemaName: string): Knex => {
  return knex.withSchema(schemaName)
}

// Find tenant by ID (with validation)
export const findTenantById = async (tenantId: string): Promise<Tenant> => {
  // Validates tenant exists and is active
}
```

## Tenant Lifecycle

### 1. Tenant Onboarding

```typescript
// POST /api/v1/tenants (SuperAdmin only)

// Flow:
// 1. Create tenant record in public.tenants
// 2. Generate schema name (tenant_<uuid>)
// 3. Create PostgreSQL schema
// 4. Run tenant-specific migrations
// 5. Seed initial data (if any)
// 6. Return tenant details
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/tenants \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "phone": "+1234567890"
  }'

# Response
{
  "success": true,
  "statusCode": 201,
  "message": "Tenant onboarded successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "schemaName": "tenant_123e4567_e89b_12d3_a456_426614174000",
    "isActive": true
  }
}
```

### 2. Tenant Isolation

**For operations that need schema name (e.g., account APIs):**

```typescript
// 1. Use setTenantContext middleware in route
router.get('/accounts', authenticate, setTenantContext, requireTenantContext, getAccounts)

// 2. In controller, get tenant context
const tenantContext = getTenantContext(req) as TenantContext

// 3. Use schema name for tenant-specific queries
const accounts = await findAccounts(
  tenantContext.tenantId,
  tenantContext.schemaName,  // Required for withTenantSchema()
  filters
)
```

**For operations that only need tenantId (e.g., user invitations, audit logs):**

```typescript
// 1. Extract tenant ID directly from JWT
const tenantId = req.user?.selectedTenantId

if (!tenantId) {
  throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED)
}

// 2. Use tenantId directly in queries (no schema name needed)
const invitations = await findInvitations(filters, tenantId)
```

### 3. Tenant Queries

```typescript
// Always filter by tenant in queries
export const findAccountById = async (
  tenantId: string,
  accountId: string
): Promise<Account> => {
  const schemaName = getTenantSchemaName(tenantId)
  const tenantKnex = getTenantKnex(schemaName)
  
  try {
    const account = await Account.queryForTenant(tenantKnex)
      .findById(accountId)
      .modify('notDeleted')
    
    if (!account) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Account not found')
    }
    
    return account
  } finally {
    await tenantKnex.destroy()
  }
}
```

## Security Considerations

### 1. Schema Naming

```typescript
// Schema names are deterministic based on tenant UUID
tenant_123e4567_e89b_12d3_a456_426614174000

// Benefits:
// - No collisions
// - No enumeration attacks
// - Easy to identify tenant
```

### 2. Access Control

```typescript
// JWT includes tenant ID
{
  "user": {
    "id": "...",
    "email": "...",
    "role": "admin",
    "tenantId": "123e4567-e89b-12d3-a456-426614174000"  // ✅
  }
}

// Middleware validates:
// 1. User belongs to tenant
// 2. Tenant is active
// 3. User has permission for operation
```

### 3. Data Isolation

```typescript
// Users can only access their tenant's data
// Even if they somehow get another tenant's ID:

// 1. Middleware validates user.tenantId matches requested tenant
// 2. All queries are schema-scoped
// 3. PostgreSQL enforces schema boundaries
```

## Migration Management

### Global Migrations

```bash
# Location: src/database/migrations/*.ts
# Run for public schema

pnpm db:migrate         # Run all migrations
pnpm db:migrate:rollback # Rollback last batch
```

### Tenant Migrations

```bash
# Location: src/database/migrations/tenant/*.ts
# Run for each tenant schema during onboarding

// Automatically executed during:
// 1. Tenant onboarding (runTenantMigrations)
// 2. Adding new tenants
```

**Example Tenant Migration:**
```typescript
// 20251114100159_create_accounts_table.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary()
    table.uuid('tenant_id').notNullable()
    table.string('account_code').notNullable()
    table.string('account_name').notNullable()
    // ... other fields
    
    // Index on tenant_id for quick lookups
    table.index('tenant_id')
  })
}
```

## Best Practices

### 1. Use Tenant Context Only When Schema Name is Required

```typescript
// ✅ Good - For account APIs (needs schema name)
router.get('/accounts', authenticate, setTenantContext, requireTenantContext, getAccounts)

export const getAccounts = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    const accounts = await findAccounts(
      tenantContext.tenantId,
      tenantContext.schemaName,  // Required for tenant-specific queries
      filters
    )
    // ...
  }
)

// ✅ Good - For user invitations (only needs tenantId)
router.get('/invitations', authenticate, getAllInvitations)

export const getAllInvitations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.selectedTenantId  // Direct from JWT
    if (!tenantId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED)
    }
    const invitations = await findInvitations(filters, tenantId)
    // ...
  }
)

// ❌ Bad - Using tenant context when not needed
export const getAllInvitations = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req)  // Unnecessary DB query!
    const invitations = await findInvitations(filters, tenantContext.tenantId)
    // ...
  }
)
```

### 2. Clean Up Connections

```typescript
// ✅ Good
export const findAccountById = async (
  tenantId: string,
  accountId: string
): Promise<Account> => {
  const schemaName = getTenantSchemaName(tenantId)
  const tenantKnex = getTenantKnex(schemaName)
  
  try {
    return await Account.queryForTenant(tenantKnex)
      .findById(accountId)
  } finally {
    await tenantKnex.destroy()  // Always clean up!
  }
}

// ❌ Bad
export const findAccountById = async (
  tenantId: string,
  accountId: string
): Promise<Account> => {
  const tenantKnex = getTenantKnex(getTenantSchemaName(tenantId))
  return await Account.queryForTenant(tenantKnex)
    .findById(accountId)
  // Connection leak!
}
```

### 3. Use Tenant Schema Utility for Tenant-Specific Queries

```typescript
// For tenant-specific data (accounts, transactions, etc.)
// Use withTenantSchema utility with schema name from tenant context

import { withTenantSchema } from '@utils/tenantQuery'

export const findAccounts = async (
  tenantId: string,
  schemaName: string,  // From getTenantContext()
  filters: AccountListInput
): Promise<AccountQueryResult> => {
  return withTenantSchema(schemaName, async (trx) => {
    let query = Account.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
    
    // Apply filters, pagination, etc.
    return { accounts: await query, total: await query.resultSize() }
  })
}
```

## Multi-Tenant Queries

### Pattern for Tenant Operations

**When schema name is required (tenant-specific data like accounts):**

```typescript
// Route
router.get('/accounts', authenticate, setTenantContext, requireTenantContext, getAccounts)

// Controller
export const getAccounts = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const tenantContext = getTenantContext(req) as TenantContext
    
    // Use withTenantSchema utility
    const result = await findAccounts(
      tenantContext.tenantId,
      tenantContext.schemaName,  // Required
      filters
    )
    
    return result
  }
)

// Query
export const findAccounts = async (
  tenantId: string,
  schemaName: string,
  filters: AccountListInput
): Promise<AccountQueryResult> => {
  return withTenantSchema(schemaName, async (trx) => {
    // Query logic using tenant schema
    return await Account.query(trx)
      .modify('notDeleted')
      .modify('byTenant', tenantId)
      // ...
  })
}
```

**When only tenantId is needed (public schema data like invitations):**

```typescript
// Route (no tenant context middleware needed)
router.get('/invitations', authenticate, getAllInvitations)

// Controller
export const getAllInvitations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user?.selectedTenantId  // Direct from JWT
    
    if (!tenantId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.TENANT_CONTEXT_REQUIRED)
    }
    
    // Query public schema with tenantId filter
    const result = await findInvitations(filters, tenantId)
    
    return result
  }
)

// Query (public schema)
export const findInvitations = async (
  filters: InvitationListInput,
  tenantId: string  // Only tenantId needed
): Promise<InvitationQueryResult> => {
  return UserInvitation.query()
    .modify('notDeleted')
    .where('tenant_id', tenantId)  // Filter by tenant
    // ...
}
```

## Tenant Management API

### List Tenants (SuperAdmin)
```typescript
GET /api/v1/tenants
```

### Get Tenant (SuperAdmin)
```typescript
GET /api/v1/tenants/:id
```

### Create Tenant (SuperAdmin)
```typescript
POST /api/v1/tenants
Body: {
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  website?: string
}
```

### Update Tenant (SuperAdmin)
```typescript
PATCH /api/v1/tenants/:id
Body: {
  name?: string
  email?: string
  // ... any tenant fields
}
```

### Delete Tenant (SuperAdmin)
```typescript
DELETE /api/v1/tenants/:id
// Soft delete - marks tenant as deleted
```

## Troubleshooting

### Schema Not Found
```
Error: relation "tenant_xxx.accounts" does not exist
```

**Solution:**
1. Check tenant exists: `SELECT * FROM tenants WHERE id = 'xxx'`
2. Check schema exists: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tenant_xxx'`
3. Run tenant migrations: `runTenantMigrations(schemaName)`

### Connection Leaks
```
Warning: Too many database connections
```

**Solution:**
1. Always use `try/finally` with `tenantKnex.destroy()`
2. Don't create multiple connections in same request
3. Check for unclosed connections in queries

### Cross-Tenant Data Access
```
Error: Forbidden - Access denied
```

**Solution:**
1. Verify JWT contains correct `tenantId`
2. Check middleware is validating tenant access
3. Ensure queries filter by `tenant_id`

## Performance Considerations

### 1. Connection Pooling
- Each tenant Knex instance uses connection pooling
- Always destroy connections after use
- Monitor connection pool size

### 2. Schema Caching
- Schema names are deterministic (no lookups needed)
- Tenant validation cached (consider Redis)

### 3. Indexing
- Always index `tenant_id` in tenant tables
- Add indexes for common query patterns
- Monitor query performance per tenant

## Future Enhancements

### Planned Features
- [ ] Tenant usage metrics
- [ ] Tenant billing integration
- [ ] Tenant feature flags
- [ ] Cross-tenant reporting (SuperAdmin)
- [ ] Tenant backup/restore
- [ ] Tenant data export

---

**Related Documentation:**
- [User Management](./USER_MANAGEMENT.md)
- [Role Management](./ROLE_MANAGEMENT.md)
- [Account Management](./ACCOUNT_MANAGEMENT.md)

