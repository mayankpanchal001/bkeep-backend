# Model Usage Guidelines - Hybrid Approach

## 🎯 Philosophy

Use the **right tool for the job**:
- **Model methods** for simple, type-safe CRUD operations
- **Direct Knex/Joins** for complex queries and performance-critical operations

## 📋 Decision Matrix

### ✅ Use Model Methods When:

1. **Simple CRUD Operations**
   ```typescript
   // ✅ Good - Type-safe, idempotent
   await UserRole.assignRole(userId, roleId, tenantId)
   await UserTenant.addUserToTenant(userId, tenantId, true)
   ```

2. **Single Record Operations**
   ```typescript
   // ✅ Good - Clear intent, validated
   const userTenant = await UserTenant.findByUserAndTenant(userId, tenantId)
   const isMember = await UserTenant.isMember(userId, tenantId)
   ```

3. **Type Safety is Critical**
   ```typescript
   // ✅ Good - Compile-time type checking
   const roles = await UserRole.findByUserAndTenant(userId, tenantId)
   // roles is typed as UserRole[]
   ```

4. **Idempotent Operations Needed**
   ```typescript
   // ✅ Good - Safe to call multiple times
   await UserRole.assignRole(userId, roleId, tenantId)
   ```

5. **Business Logic with Validation**
   ```typescript
   // ✅ Good - Includes validation
   await assignRoleToUser({ userId, roleId, tenantId })
   // Validates user, role, tenant, membership
   ```

---

### ✅ Use Direct Knex/Joins When:

1. **Complex Queries with Multiple Joins**
   ```typescript
   // ✅ Good - Performance optimized
   const users = await User.query()
     .modify('notDeleted')
     .join('user_tenants', 'users.id', 'user_tenants.user_id')
     .join('user_roles', 'users.id', 'user_roles.user_id')
     .where('user_tenants.tenant_id', tenantId)
     .where('user_roles.tenant_id', tenantId)
     .groupBy('users.id')
   ```

2. **Aggregations and Counts**
   ```typescript
   // ✅ Good - Single query, efficient
   const count = await db('user_tenants')
     .where('tenant_id', tenantId)
     .count('* as total')
     .first()
   ```

3. **Filtering in Graph Queries**
   ```typescript
   // ✅ Good - Objection.js pattern
   const users = await User.query()
     .withGraphFetched('roles')
     .modifyGraph('roles', (builder) => {
       builder.where('user_roles.tenant_id', tenantId)
     })
   ```

4. **Batch Operations with Complex Logic**
   ```typescript
   // ✅ Good - Single efficient query
   const pivotData = await db('user_tenants')
     .whereIn('user_id', userIds)
     .select('user_id', 'tenant_id', 'is_primary', 'created_at')
   ```

5. **Performance-Critical Paths**
   ```typescript
   // ✅ Good - Optimized query
   const userWithTenants = await User.query()
     .findById(userId)
     .joinRelated('tenants')
     .where('user_tenants.is_primary', true)
   ```

6. **Subqueries for Filtering**
   ```typescript
   // ✅ Good - SQL optimization
   query.whereNotExists((builder) => {
     builder
       .select(1)
       .from('user_roles')
       .join('roles', 'user_roles.role_id', 'roles.id')
       .whereRaw('user_roles.user_id = users.id')
       .where('roles.name', 'superadmin')
   })
   ```

---

## 🔄 Hybrid Approach Examples

### Example 1: User Invitation Flow

```typescript
// ✅ Hybrid - Model for validation, Knex for performance
export const acceptInvitation = async (token: string) => {
  return db.transaction(async (trx) => {
    // Use model for complex validation
    const invitation = await UserInvitation.findByToken(token)
    
    // Simple check with model method
    const isMember = await UserTenant.isMember(userId, tenantId)
    if (isMember) {
      throw new ApiError(HTTP_STATUS.CONFLICT, 'Already a member')
    }
    
    // Use Knex for batch operations in transaction
    await trx('user_tenants')
      .where('user_id', userId)
      .patch({ is_primary: false })
    
    await trx('user_tenants').insert({
      user_id: userId,
      tenant_id: tenantId,
      is_primary: true,
    })
    
    // Use model method for role sync
    await UserRole.syncUserRolesInTenant(userId, tenantId, [roleId])
  })
}
```

### Example 2: List Users with Roles

```typescript
// ✅ Hybrid - Joins for performance, models for post-processing
export const listUsers = async (filters: UserListInput, tenantId?: string) => {
  // Use Objection joins for efficient query
  let query = User.query()
    .modify('notDeleted')
    .withGraphFetched('roles.[permissions]')
    .modifyGraph('roles', (builder) => {
      if (tenantId) {
        builder.where('user_roles.tenant_id', tenantId)
      }
    })
  
  if (tenantId) {
    query = query
      .join('user_tenants', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
  }
  
  const users = await query
  
  // If pivot data needed, fetch efficiently in batch
  if (users.length > 0 && tenantId) {
    const userIds = users.map(u => u.id)
    const userTenants = await UserTenant.query()
      .whereIn('user_id', userIds)
      .where('tenant_id', tenantId)
    
    // Merge pivot data
    const pivotMap = new Map(userTenants.map(ut => [ut.userId, ut]))
    users.forEach(user => {
      const pivot = pivotMap.get(user.id)
      user.userTenants = pivot ? { isPrimary: pivot.isPrimary } : undefined
    })
  }
  
  return users
}
```

### Example 3: Tenant User Count

```typescript
// ✅ Direct Knex - Simple, efficient aggregation
export const getTenantUserCount = async (tenantId: string) => {
  const result = await db('user_tenants')
    .where('tenant_id', tenantId)
    .count('* as count')
    .first()
  
  return Number(result?.count || 0)
}
```

---

## 📐 Best Practices

### 1. **Prefer Model Methods for Business Logic**

```typescript
// ✅ Good - Clear intent, validated
if (await UserTenant.isMember(userId, tenantId)) {
  throw new ApiError(HTTP_STATUS.CONFLICT, 'Already a member')
}

// ❌ Avoid - Inline query, no validation
const existing = await db('user_tenants')
  .where('user_id', userId)
  .where('tenant_id', tenantId)
  .first()
if (existing) {
  throw new ApiError(HTTP_STATUS.CONFLICT, 'Already a member')
}
```

### 2. **Use Joins for Query Performance**

```typescript
// ✅ Good - Single query with join
const users = await User.query()
  .join('user_tenants', 'users.id', 'user_tenants.user_id')
  .where('user_tenants.tenant_id', tenantId)
  .select('users.*')

// ❌ Avoid - N+1 query problem
const allUsers = await User.query()
for (const user of allUsers) {
  const isMember = await UserTenant.isMember(user.id, tenantId)
  if (isMember) filteredUsers.push(user)
}
```

### 3. **Use Models for Mutations**

```typescript
// ✅ Good - Idempotent, type-safe
await UserRole.assignRole(userId, roleId, tenantId)

// ✅ Also good for simple inserts
await UserTenant.addUserToTenant(userId, tenantId, true)

// ⚠️ Acceptable for batch inserts in transactions
await trx('user_roles').insert(userRolesRecords)
```

### 4. **Use Direct Queries for Read-Heavy Operations**

```typescript
// ✅ Good - Efficient batch fetch
const pivotData = await db('user_tenants')
  .whereIn('user_id', userIds)
  .select('user_id', 'tenant_id', 'is_primary')

// ❌ Avoid - Multiple queries
const pivotData = await Promise.all(
  userIds.map(id => UserTenant.findByUser(id))
)
```

### 5. **Use Objection Graph Filtering**

```typescript
// ✅ Good - Objection.js optimization
const user = await User.query()
  .findById(userId)
  .withGraphFetched('roles')
  .modifyGraph('roles', (builder) => {
    builder.where('user_roles.tenant_id', tenantId)
  })

// ❌ Avoid - Manual filtering after fetch
const user = await User.query()
  .findById(userId)
  .withGraphFetched('roles')
user.roles = user.roles?.filter(r => r.tenantId === tenantId)
```

---

## 🎯 Decision Flowchart

```
┌─────────────────────────────────┐
│   Need to query database?       │
└────────────┬────────────────────┘
             │
             ▼
    ┌─────────────────┐
    │ Is it a simple  │     YES
    │ CRUD operation? ├────────► Use Model Method
    │ (create/delete/ │           (UserRole.assignRole)
    │  check/find)    │
    └────────┬────────┘
             │ NO
             ▼
    ┌─────────────────┐
    │ Multiple joins  │     YES
    │ or complex      ├────────► Use Direct Knex/Join
    │ aggregation?    │           (query.join().where())
    └────────┬────────┘
             │ NO
             ▼
    ┌─────────────────┐
    │ Batch operation │     YES
    │ with 100+       ├────────► Use Direct Knex
    │ records?        │           (db.insert([...]))
    └────────┬────────┘
             │ NO
             ▼
    ┌─────────────────┐
    │ Graph filtering │     YES
    │ or relation     ├────────► Use modifyGraph
    │ constraints?    │           (.modifyGraph('roles'))
    └────────┬────────┘
             │ NO
             ▼
      Use Model Method
      (default choice)
```

---

## 📊 Performance Considerations

### When Model Methods Add Overhead

```typescript
// ⚠️ Adds query overhead - extra validation queries
await assignRoleToUser({ userId, roleId, tenantId })
// Internally: validates user, role, tenant, membership (4 queries)

// ✅ Better for batch operations
await UserRole.query(trx).insert(userRolesRecords)
// Single insert query
```

### When Joins Are Better

```typescript
// ⚠️ N+1 problem
const users = await User.query().where('is_active', true)
const tenantsPerUser = await Promise.all(
  users.map(u => UserTenant.findByUser(u.id))
) // N queries

// ✅ Single query with join
const users = await User.query()
  .where('users.is_active', true)
  .withGraphFetched('tenants')
// 2 queries total (1 for users, 1 for tenants)
```

---

## 🔧 Refactoring Guidelines

### When to Refactor TO Model Methods

- Direct queries scattered across codebase
- No type safety causing bugs
- Business logic mixed with SQL
- Need validation and error handling

### When to Keep Direct Queries

- Performance-critical paths (API endpoints with high traffic)
- Complex reporting queries
- Migrations and seeds
- One-off admin scripts

---

## 📝 Summary

| Operation Type | Use | Example |
|---------------|-----|---------|
| Simple Check | Model | `UserTenant.isMember()` |
| Simple Insert | Model | `UserRole.assignRole()` |
| Simple Delete | Model | `UserTenant.removeUserFromTenant()` |
| Complex Query | Direct | `.join().where().groupBy()` |
| Batch Operations | Direct | `db.insert([...])` |
| Aggregations | Direct | `.count().sum()` |
| Graph Filtering | Direct | `.modifyGraph()` |
| Validation Required | Model | `assignRoleToUser()` |
| Type Safety Critical | Model | Model methods |
| Performance Critical | Direct | Joins and optimized queries |

---

## 🎯 Golden Rule

> **Use model methods for business logic and simple operations.  
> Use direct queries for performance-critical and complex queries.  
> Always prioritize code readability and maintainability.**

---

**Last Updated**: December 2, 2025  
**Version**: 1.0.0

