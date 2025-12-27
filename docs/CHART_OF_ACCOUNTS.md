# Chart of Accounts Implementation

---

## Overview

Chart of Accounts is the foundation of double-entry bookkeeping in BKeep. It provides a systematic way to organize and categorize all financial accounts used in accounting transactions. This feature is critical for:

- **Proper Accounting Structure**: Organizes accounts into standard categories (Assets, Liabilities, Equity, Revenue, Expense)
- **General Ledger**: Creates the foundation for the general ledger and financial reporting
- **Balance Tracking**: Tracks current and opening balances for each account
- **Financial Reporting**: Enables generation of Balance Sheets, Income Statements, and other financial reports
- **Hierarchical Organization**: Supports parent-child relationships for detailed account categorization
- **Account Numbering**: Automatic or manual account numbering for easy identification

**Key Benefits:**
- ✅ Automatic account number generation based on account type
- ✅ Hierarchical account structure (parent-child relationships)
- ✅ Balance tracking (opening and current balances)
- ✅ Account activation/deactivation without deletion
- ✅ Integration with bank accounts
- ✅ Tax tracking support
- ✅ Multi-currency support
- ✅ System account protection

---

## Flow

### Account Creation Flow

```
1. User provides account details (name, type, etc.)
   ↓
2. System validates account rules:
   - Parent account type matches (if parent provided)
   - Account number uniqueness (if provided)
   ↓
3. Auto-generate account number (if not provided)
   - Asset: 1000-1999
   - Liability: 2000-2999
   - Equity: 3000-3999
   - Revenue: 4000-4999
   - Expense: 5000-5999
   ↓
4. Create account with opening balance
   ↓
5. Set current balance = opening balance
   ↓
6. Return created account
```

### Account Update Flow

```
1. User provides updated account details
   ↓
2. System validates:
   - Account exists and belongs to tenant
   - Not a system account (if modifying protected fields)
   - Parent account type matches (if changing parent)
   - Account number uniqueness (if changing number)
   ↓
3. Update account fields
   ↓
4. Return updated account
```

### Account Deletion Flow

```
1. User requests account deletion
   ↓
2. System validates:
   - Account exists and belongs to tenant
   - Not a system account
   - Account has no children
   - Account has no transactions (via journal entries)
   ↓
3. Soft delete account (set deleted_at)
   ↓
4. Return deleted account
```

### Account Hierarchy Flow

```
1. User requests account hierarchy
   ↓
2. System fetches top-level accounts (parent_account_id IS NULL)
   ↓
3. For each top-level account, fetch children recursively
   ↓
4. Return hierarchical structure
```

### Balance Update Flow (via Journal Entries)

```
1. Journal entry is posted
   ↓
2. For each journal entry line:
   - Get account from chart_of_accounts
   - Calculate balance change (debit - credit)
   - Update account.current_balance
   ↓
3. Account balance reflects all posted transactions
```

---

## Features Implemented

### Core Features

1. **Account Management**
   - Create, read, update, and soft delete accounts
   - Account activation/deactivation
   - Account restoration (undo soft delete)

2. **Account Numbering**
   - Automatic account number generation based on account type
   - Manual account number assignment
   - Account number uniqueness validation per tenant

3. **Account Types**
   - **Asset**: Current assets, fixed assets, other assets
   - **Liability**: Current liabilities, long-term liabilities, other liabilities
   - **Equity**: Equity, retained earnings
   - **Revenue**: Operating revenue, other revenue
   - **Expense**: Cost of goods sold, operating expenses, other expenses

4. **Hierarchical Structure**
   - Parent-child account relationships
   - Top-level accounts (no parent)
   - Sub-accounts (with parent)
   - Account hierarchy retrieval

5. **Balance Tracking**
   - Opening balance (initial balance when account created)
   - Current balance (updated via journal entries)
   - Balance updates when journal entries are posted

6. **Account Properties**
   - Active/inactive status
   - System account protection
   - Currency code (ISO 4217)
   - Description
   - Tax tracking
   - Default tax ID

7. **Bank Account Integration**
   - Link chart of account to bank account (accounts table)
   - Bank account number and routing number storage
   - Reconciliation support

8. **Search and Filtering**
   - Search by account name, number, or description
   - Filter by account type, subtype, parent, active status
   - Pagination and sorting

9. **Validation Rules**
   - Parent account type must match child type
   - Account number must be unique per tenant
   - Cannot delete accounts with children
   - Cannot modify system accounts
   - Cannot delete accounts in use (has transactions)

---

## Database Schema

### Table: `chart_of_accounts`

**Location**: Tenant-specific schema (e.g., `tenant_acme_corp`)

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Account unique identifier |
| `tenant_id` | UUID | NOT NULL, FK → `public.tenants.id` | Tenant this account belongs to |
| `created_by` | UUID | NOT NULL, FK → `public.users.id` | User who created the account |
| `account_number` | VARCHAR(50) | NULLABLE | Account number (e.g., "1000", "1100") |
| `account_name` | VARCHAR(255) | NOT NULL | Account name (e.g., "Cash", "Accounts Receivable") |
| `account_type` | VARCHAR(50) | NOT NULL | Account type: asset, liability, equity, revenue, expense |
| `account_subtype` | VARCHAR(100) | NULLABLE | Account subtype (e.g., "current_asset", "fixed_asset") |
| `account_detail_type` | VARCHAR(100) | NULLABLE | Detailed classification (e.g., "checking", "savings") |
| `parent_account_id` | UUID | NULLABLE, FK → `chart_of_accounts.id` | Parent account ID for hierarchy |
| `current_balance` | DECIMAL(15,4) | NOT NULL, DEFAULT 0 | Current balance of the account |
| `opening_balance` | DECIMAL(15,4) | NOT NULL, DEFAULT 0 | Opening balance when account was created |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether the account is active |
| `is_system_account` | BOOLEAN | NOT NULL, DEFAULT false | System accounts cannot be deleted |
| `currency_code` | VARCHAR(3) | NOT NULL, DEFAULT 'USD' | ISO 4217 currency code |
| `description` | TEXT | NULLABLE | Account description |
| `track_tax` | BOOLEAN | NOT NULL, DEFAULT false | Whether to track tax for this account |
| `default_tax_id` | UUID | NULLABLE | Default tax ID for this account |
| `bank_account_number` | VARCHAR(100) | NULLABLE | Bank account number if this is a bank account |
| `bank_routing_number` | VARCHAR(50) | NULLABLE | Bank routing number if this is a bank account |
| `bank_account_id` | UUID | NULLABLE, FK → `accounts.id` | Link to bank account (accounts table) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account last update timestamp |
| `deleted_at` | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes**:

- `idx_chart_of_accounts_tenant_id` on `tenant_id`
- `idx_chart_of_accounts_created_by` on `created_by`
- `idx_chart_of_accounts_account_type` on `account_type`
- `idx_chart_of_accounts_parent_account_id` on `parent_account_id`
- `idx_chart_of_accounts_is_active` on `is_active`
- `idx_chart_of_accounts_deleted_at` on `deleted_at`
- `idx_chart_of_accounts_bank_account_id` on `bank_account_id`
- `idx_chart_of_accounts_tenant_deleted` on `(tenant_id, deleted_at)` - Composite index for finding active accounts
- `idx_chart_of_accounts_tenant_type` on `(tenant_id, account_type)` - Composite index for filtering by type
- `idx_chart_of_accounts_tenant_parent` on `(tenant_id, parent_account_id)` - Composite index for finding children
- `idx_chart_of_accounts_tenant_active` on `(tenant_id, is_active, deleted_at)` - Composite index for active accounts

**Unique Constraints**:

- `unique_chart_of_accounts_tenant_number` on `(tenant_id, account_number, deleted_at)` - Ensures account number uniqueness per tenant (excluding soft-deleted accounts)

**Foreign Keys**:

- `fk_chart_of_accounts_tenant` → `public.tenants(id)` ON DELETE CASCADE
- `fk_chart_of_accounts_created_by` → `public.users(id)` ON DELETE RESTRICT
- `fk_chart_of_accounts_parent` → `chart_of_accounts(id)` ON DELETE SET NULL
- `fk_chart_of_accounts_bank_account` → `accounts(id)` ON DELETE SET NULL

**Relationships**:

- **Parent Account**: Self-referential relationship (parent_account_id → chart_of_accounts.id)
- **Bank Account**: Optional relationship to accounts table (bank_account_id → accounts.id)
- **Tenant**: Many-to-one relationship (tenant_id → public.tenants.id)
- **Created By**: Many-to-one relationship (created_by → public.users.id)

---

## Architecture

### Technology Stack

- **ORM**: Objection.js with Knex query builder
- **Database**: PostgreSQL with tenant-specific schemas
- **Validation**: Zod schemas for request validation
- **Routing**: Express.js with TypeScript
- **Authentication**: JWT-based authentication
- **Multi-tenancy**: Schema-based isolation

### File Structure

```
src/
├── models/
│   └── ChartOfAccount.ts              # ChartOfAccount model with relations and modifiers
├── types/
│   └── chartOfAccount.type.ts         # TypeScript type definitions
├── schema/
│   └── chartOfAccount.schema.ts       # Zod validation schemas
├── queries/
│   └── chartOfAccount.queries.ts      # Database query functions
├── controllers/
│   └── chartOfAccount.controller.ts   # HTTP request handlers
├── routes/
│   └── chartOfAccount.route.ts        # Route definitions
└── database/
    └── migrations/
        └── tenant/
            └── 20251204134147_create_chart_of_accounts_table.ts  # Migration file
```

### Design Patterns

1. **Repository Pattern**: Query functions in `queries/` directory encapsulate database operations
2. **MVC Pattern**: Controllers handle HTTP requests, models represent data, routes define endpoints
3. **Validation Pattern**: Zod schemas validate all inputs before processing
4. **Multi-tenancy Pattern**: Tenant context middleware ensures data isolation
5. **Soft Delete Pattern**: Accounts are soft-deleted (deleted_at) rather than hard-deleted

### Model Structure

**ChartOfAccount Model** (`src/models/ChartOfAccount.ts`):

- Extends `BaseModel` for UUID, timestamps, and soft delete support
- Defines account types and subtypes as enums
- Includes JSON schema for validation
- Query modifiers: `byTenant`, `byType`, `active`, `inactive`, `search`, `byParent`, `topLevel`, `systemAccounts`
- Helper methods: `isAsset()`, `isLiability()`, `isEquity()`, `isRevenue()`, `isExpense()`, `updateBalance()`, `hasChildren()`
- Relations: `parent`, `children`, `bankAccount`

### Query Functions

**Key Query Functions** (`src/queries/chartOfAccount.queries.ts`):

- `findChartOfAccounts()`: List accounts with pagination, sorting, search, and filtering
- `findChartOfAccountById()`: Get account by ID
- `findChartOfAccountByNumber()`: Get account by account number
- `createChartOfAccount()`: Create new account with validation
- `updateChartOfAccount()`: Update account with validation
- `deleteChartOfAccount()`: Soft delete account
- `restoreChartOfAccount()`: Restore soft-deleted account
- `updateChartOfAccountActivationStatus()`: Activate/deactivate account
- `getAccountHierarchy()`: Get hierarchical account structure
- `generateAccountNumber()`: Auto-generate account number based on type
- `validateAccountRules()`: Validate account rules before create/update
- `updateChartOfAccountBalance()`: Update account balance (called by journal entries)
- `linkBankAccountToChartAccount()`: Link chart account to bank account

### Controller Functions

**Key Controller Functions** (`src/controllers/chartOfAccount.controller.ts`):

- `getAllChartOfAccounts()`: List all accounts with filters
- `getChartOfAccountHierarchy()`: Get account hierarchy
- `getChartOfAccountById()`: Get account by ID
- `createChartOfAccountController()`: Create new account
- `updateChartOfAccountController()`: Update account
- `deleteChartOfAccountById()`: Soft delete account
- `restoreChartOfAccountById()`: Restore account
- `activateChartOfAccount()`: Activate account
- `deactivateChartOfAccount()`: Deactivate account

---

## API Endpoints

### Base URL

All endpoints are prefixed with `/api/v1/chart-of-accounts`

### Authentication

All endpoints require authentication via JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Endpoints

#### 1. List Chart of Accounts

**GET** `/chart-of-accounts`

Retrieves all chart of accounts with pagination, sorting, search, and filtering.

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (minimum: 1) |
| `limit` | integer | No | 20 | Items per page (minimum: 1, maximum: 100) |
| `sort` | string | No | `accountName` | Sort field: `accountNumber`, `accountName`, `accountType`, `currentBalance`, `openingBalance`, `isActive`, `createdAt`, `updatedAt` |
| `order` | string | No | `asc` | Sort order: `asc` or `desc` |
| `search` | string | No | - | Search term (searches name, number, description) |
| `isActive` | boolean | No | - | Filter by active status |
| `accountType` | string | No | - | Filter by account type: `asset`, `liability`, `equity`, `revenue`, `expense` |
| `accountSubtype` | string | No | - | Filter by account subtype |
| `parentAccountId` | UUID | No | - | Filter by parent account ID (use `null` for top-level accounts) |

**Request Example**:

```bash
GET /api/v1/chart-of-accounts?page=1&limit=20&sort=accountName&order=asc&accountType=asset&isActive=true
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of accounts fetched successfully",
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "accountNumber": "1000",
        "accountName": "Cash",
        "accountType": "asset",
        "accountSubtype": "current_asset",
        "accountDetailType": null,
        "parentAccountId": null,
        "currentBalance": 50000.00,
        "openingBalance": 50000.00,
        "currencyCode": "USD",
        "isActive": true,
        "description": "Main cash account",
        "trackTax": false,
        "createdAt": "2025-12-04T10:00:00.000Z",
        "updatedAt": "2025-12-04T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required

---

#### 2. Get Account Hierarchy

**GET** `/chart-of-accounts/hierarchy`

Retrieves top-level accounts with their children in hierarchical structure.

**Request Example**:

```bash
GET /api/v1/chart-of-accounts/hierarchy
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of accounts fetched successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "accountNumber": "1000",
      "accountName": "Current Assets",
      "accountType": "asset",
      "accountSubtype": "current_asset",
      "currentBalance": 100000.00,
      "currencyCode": "USD",
      "isActive": true,
      "children": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "accountNumber": "1100",
          "accountName": "Cash",
          "accountType": "asset",
          "currentBalance": 50000.00,
          "currencyCode": "USD",
          "isActive": true
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "accountNumber": "1200",
          "accountName": "Accounts Receivable",
          "accountType": "asset",
          "currentBalance": 50000.00,
          "currencyCode": "USD",
          "isActive": true
        }
      ]
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required

---

#### 3. Get Chart of Account by ID

**GET** `/chart-of-accounts/:id`

Retrieves a specific chart of account by ID.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Chart of account ID |

**Request Example**:

```bash
GET /api/v1/chart-of-accounts/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of account fetched successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accountNumber": "1000",
    "accountName": "Cash",
    "accountType": "asset",
    "accountSubtype": "current_asset",
    "accountDetailType": null,
    "parentAccountId": null,
    "currentBalance": 50000.00,
    "openingBalance": 50000.00,
    "currencyCode": "USD",
    "isActive": true,
    "description": "Main cash account",
    "trackTax": false,
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required
- `404 Not Found`: Chart of account not found

---

#### 4. Create Chart of Account

**POST** `/chart-of-accounts`

Creates a new chart of account.

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountNumber` | string | No | Account number (max 50 chars). If not provided, auto-generated based on account type |
| `accountName` | string | Yes | Account name (1-255 chars) |
| `accountType` | enum | Yes | Account type: `asset`, `liability`, `equity`, `revenue`, `expense` |
| `accountSubtype` | string | No | Account subtype (max 100 chars) |
| `accountDetailType` | string | No | Account detail type (max 100 chars) |
| `parentAccountId` | UUID | No | Parent account ID (for sub-accounts) |
| `openingBalance` | number | No | Opening balance (default: 0) |
| `currencyCode` | string | No | ISO 4217 currency code (default: "USD") |
| `description` | string | No | Account description |
| `trackTax` | boolean | No | Whether to track tax (default: false) |
| `defaultTaxId` | UUID | No | Default tax ID |
| `bankAccountNumber` | string | No | Bank account number (max 100 chars) |
| `bankRoutingNumber` | string | No | Bank routing number (max 50 chars) |

**Request Example**:

```bash
POST /api/v1/chart-of-accounts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "accountName": "Cash",
  "accountType": "asset",
  "accountSubtype": "current_asset",
  "openingBalance": 50000.00,
  "currencyCode": "USD",
  "description": "Main cash account"
}
```

**Response Example** (201 Created):

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Chart of account created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accountNumber": "1000",
    "accountName": "Cash",
    "accountType": "asset",
    "accountSubtype": "current_asset",
    "accountDetailType": null,
    "parentAccountId": null,
    "currentBalance": 50000.00,
    "openingBalance": 50000.00,
    "currencyCode": "USD",
    "isActive": true,
    "description": "Main cash account",
    "trackTax": false,
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Validation error (invalid account type, missing required fields, etc.)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required
- `409 Conflict`: Account number already exists or parent type mismatch

**Validation Rules**:

- `accountName` must be 1-255 characters
- `accountType` must be one of: `asset`, `liability`, `equity`, `revenue`, `expense`
- `accountNumber` must be unique per tenant (if provided)
- `parentAccountId` must exist and have matching account type (if provided)
- `currencyCode` must be 3 characters (ISO 4217)

---

#### 5. Update Chart of Account

**PUT** `/chart-of-accounts/:id`

Updates an existing chart of account.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Chart of account ID |

**Request Body**:

All fields are optional. Only provided fields will be updated.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountNumber` | string | No | Account number (max 50 chars) |
| `accountName` | string | No | Account name (1-255 chars) |
| `accountSubtype` | string | No | Account subtype (max 100 chars) |
| `accountDetailType` | string | No | Account detail type (max 100 chars) |
| `parentAccountId` | UUID \| null | No | Parent account ID (use `null` to remove parent) |
| `currencyCode` | string | No | ISO 4217 currency code |
| `description` | string \| null | No | Account description (use `null` to clear) |
| `trackTax` | boolean | No | Whether to track tax |
| `defaultTaxId` | UUID \| null | No | Default tax ID (use `null` to clear) |
| `bankAccountNumber` | string \| null | No | Bank account number (use `null` to clear) |
| `bankRoutingNumber` | string \| null | No | Bank routing number (use `null` to clear) |
| `isActive` | boolean | No | Active status |

**Request Example**:

```bash
PUT /api/v1/chart-of-accounts/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "accountName": "Cash - Main Account",
  "description": "Updated description",
  "isActive": true
}
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of account updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accountNumber": "1000",
    "accountName": "Cash - Main Account",
    "accountType": "asset",
    "accountSubtype": "current_asset",
    "accountDetailType": null,
    "parentAccountId": null,
    "currentBalance": 50000.00,
    "openingBalance": 50000.00,
    "currencyCode": "USD",
    "isActive": true,
    "description": "Updated description",
    "trackTax": false,
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:05:00.000Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required or cannot modify system account
- `404 Not Found`: Chart of account not found
- `409 Conflict`: Account number already exists or parent type mismatch

**Validation Rules**:

- Cannot modify `accountType` if account has transactions
- Cannot modify system accounts
- `parentAccountId` must exist and have matching account type (if provided)
- `accountNumber` must be unique per tenant (if changing)

---

#### 6. Delete Chart of Account

**DELETE** `/chart-of-accounts/:id`

Soft deletes a chart of account.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Chart of account ID |

**Request Example**:

```bash
DELETE /api/v1/chart-of-accounts/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of account deleted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accountNumber": "1000",
    "accountName": "Cash",
    "deletedAt": "2025-12-04T10:10:00.000Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required, cannot delete system account, or account has children
- `404 Not Found`: Chart of account not found
- `409 Conflict`: Account has children and cannot be deleted

**Validation Rules**:

- Cannot delete system accounts
- Cannot delete accounts with children
- Cannot delete accounts that have transactions (journal entries)

---

#### 7. Activate Chart of Account

**PATCH** `/chart-of-accounts/:id/activate`

Activates a chart of account by setting `isActive` to `true`.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Chart of account ID |

**Request Example**:

```bash
PATCH /api/v1/chart-of-accounts/550e8400-e29b-41d4-a716-446655440000/activate
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of account activated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accountNumber": "1000",
    "accountName": "Cash",
    "isActive": true,
    "updatedAt": "2025-12-04T10:15:00.000Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required
- `404 Not Found`: Chart of account not found

---

#### 8. Deactivate Chart of Account

**PATCH** `/chart-of-accounts/:id/deactivate`

Deactivates a chart of account by setting `isActive` to `false`.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Chart of account ID |

**Request Example**:

```bash
PATCH /api/v1/chart-of-accounts/550e8400-e29b-41d4-a716-446655440000/deactivate
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of account deactivated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accountNumber": "1000",
    "accountName": "Cash",
    "isActive": false,
    "updatedAt": "2025-12-04T10:20:00.000Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required
- `404 Not Found`: Chart of account not found

---

#### 9. Restore Chart of Account

**PATCH** `/chart-of-accounts/:id/restore`

Restores a soft-deleted chart of account by clearing the `deleted_at` timestamp.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Chart of account ID |

**Request Example**:

```bash
PATCH /api/v1/chart-of-accounts/550e8400-e29b-41d4-a716-446655440000/restore
Authorization: Bearer <access_token>
```

**Response Example** (200 OK):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chart of account restored successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accountNumber": "1000",
    "accountName": "Cash",
    "deletedAt": null,
    "updatedAt": "2025-12-04T10:25:00.000Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Tenant context required
- `404 Not Found`: Chart of account not found or not deleted

---

## Code Examples

### Frontend Integration

#### React/TypeScript Example

```typescript
import axios from 'axios'

const API_BASE_URL = 'https://api.bkeep.ca/api/v1'
const accessToken = 'your-access-token'

// Create chart of account
const createAccount = async (accountData: {
  accountName: string
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  openingBalance?: number
  parentAccountId?: string
}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/chart-of-accounts`,
      accountData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data.data
  } catch (error) {
    console.error('Error creating account:', error)
    throw error
  }
}

// List accounts with filters
const listAccounts = async (filters?: {
  page?: number
  limit?: number
  accountType?: string
  isActive?: boolean
  search?: string
}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/chart-of-accounts`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.data.data
  } catch (error) {
    console.error('Error listing accounts:', error)
    throw error
  }
}

// Get account hierarchy
const getAccountHierarchy = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/chart-of-accounts/hierarchy`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    return response.data.data
  } catch (error) {
    console.error('Error getting hierarchy:', error)
    throw error
  }
}

// Update account
const updateAccount = async (
  accountId: string,
  updates: {
    accountName?: string
    description?: string
    isActive?: boolean
  }
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/chart-of-accounts/${accountId}`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data.data
  } catch (error) {
    console.error('Error updating account:', error)
    throw error
  }
}

// Delete account
const deleteAccount = async (accountId: string) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/chart-of-accounts/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    return response.data.data
  } catch (error) {
    console.error('Error deleting account:', error)
    throw error
  }
}

// Usage example
const example = async () => {
  // Create a new asset account
  const cashAccount = await createAccount({
    accountName: 'Cash',
    accountType: 'asset',
    accountSubtype: 'current_asset',
    openingBalance: 50000.00,
  })
  console.log('Created account:', cashAccount)

  // List all asset accounts
  const assetAccounts = await listAccounts({
    accountType: 'asset',
    isActive: true,
  })
  console.log('Asset accounts:', assetAccounts)

  // Get account hierarchy
  const hierarchy = await getAccountHierarchy()
  console.log('Account hierarchy:', hierarchy)

  // Update account
  const updated = await updateAccount(cashAccount.id, {
    accountName: 'Cash - Main Account',
    description: 'Updated description',
  })
  console.log('Updated account:', updated)

  // Deactivate account
  await updateAccount(cashAccount.id, { isActive: false })
}
```

### Backend Integration

#### Using Query Functions

```typescript
import {
  createChartOfAccount,
  findChartOfAccounts,
  findChartOfAccountById,
  updateChartOfAccount,
  deleteChartOfAccount,
} from '@queries/chartOfAccount.queries'

// Create account
const account = await createChartOfAccount(
  tenantId,
  schemaName,
  userId,
  {
    accountName: 'Cash',
    accountType: 'asset',
    accountSubtype: 'current_asset',
    openingBalance: 50000.00,
  }
)

// List accounts
const { accounts, total } = await findChartOfAccounts(
  tenantId,
  schemaName,
  {
    page: 1,
    limit: 20,
    accountType: 'asset',
    isActive: true,
  }
)

// Get account by ID
const accountById = await findChartOfAccountById(
  tenantId,
  schemaName,
  accountId
)

// Update account
const updated = await updateChartOfAccount(
  tenantId,
  schemaName,
  accountId,
  {
    accountName: 'Cash - Main Account',
    description: 'Updated description',
  }
)

// Delete account
await deleteChartOfAccount(tenantId, schemaName, accountId)
```

#### Using Model Directly

```typescript
import { ChartOfAccount } from '@models/ChartOfAccount'
import { withTenantSchema } from '@utils/tenantQuery'

// Create account using model
const account = await withTenantSchema(schemaName, async (trx) => {
  return await ChartOfAccount.query(trx).insert({
    tenantId,
    createdBy: userId,
    accountName: 'Cash',
    accountType: 'asset',
    accountSubtype: 'current_asset',
    openingBalance: 50000.00,
    currentBalance: 50000.00,
  })
})

// Query accounts with modifiers
const accounts = await withTenantSchema(schemaName, async (trx) => {
  return await ChartOfAccount.query(trx)
    .modify('notDeleted')
    .modify('byTenant', tenantId)
    .modify('byType', 'asset')
    .modify('active')
    .orderBy('accountName', 'asc')
})

// Update balance
await account.updateBalance(1000.00) // Add 1000 to current balance
```

---

## Configuration

### Account Number Ranges

Account numbers are auto-generated based on account type:

- **Asset**: 1000-1999
- **Liability**: 2000-2999
- **Equity**: 3000-3999
- **Revenue**: 4000-4999
- **Expense**: 5000-5999

These ranges are defined in `src/queries/chartOfAccount.queries.ts` in the `generateAccountNumber()` function.

### Default Currency

Default currency code is `USD` (ISO 4217). This can be overridden when creating accounts.

### System Accounts

System accounts are protected from deletion and certain modifications. Set `isSystemAccount: true` when creating accounts that should be protected.

---

## Security Considerations

### Authentication & Authorization

- All endpoints require JWT authentication via `authenticate` middleware
- Tenant context is enforced via `setTenantContext` and `requireTenantContext` middleware
- Users can only access accounts belonging to their tenant

### Input Validation

- All inputs are validated using Zod schemas
- Account numbers must be unique per tenant
- Parent account type must match child type
- Account type cannot be changed if account has transactions

### Data Protection

- System accounts cannot be deleted or modified
- Accounts with children cannot be deleted
- Accounts with transactions cannot be deleted
- Soft delete is used instead of hard delete for data retention

### Multi-Tenancy

- All queries are scoped to tenant schema
- Tenant isolation is enforced at the database level
- Cross-tenant data access is prevented

---

## Testing

### Manual Testing Checklist

#### Create Account

- [ ] Create account with all required fields
- [ ] Create account without account number (should auto-generate)
- [ ] Create account with parent account
- [ ] Create account with invalid account type (should fail)
- [ ] Create account with duplicate account number (should fail)
- [ ] Create account with parent of different type (should fail)

#### List Accounts

- [ ] List all accounts (no filters)
- [ ] Filter by account type
- [ ] Filter by active status
- [ ] Search by account name
- [ ] Search by account number
- [ ] Search by description
- [ ] Pagination (page, limit)
- [ ] Sorting (by different fields)
- [ ] Filter by parent account ID

#### Get Account

- [ ] Get account by ID (exists)
- [ ] Get account by ID (does not exist - should return 404)
- [ ] Get account from different tenant (should return 404)

#### Update Account

- [ ] Update account name
- [ ] Update account description
- [ ] Update parent account
- [ ] Update account number
- [ ] Update system account (should fail)
- [ ] Update account with invalid parent type (should fail)

#### Delete Account

- [ ] Delete account (no children, no transactions)
- [ ] Delete system account (should fail)
- [ ] Delete account with children (should fail)
- [ ] Delete account with transactions (should fail)

#### Activate/Deactivate

- [ ] Activate inactive account
- [ ] Deactivate active account
- [ ] Activate already active account
- [ ] Deactivate already inactive account

#### Restore

- [ ] Restore soft-deleted account
- [ ] Restore non-deleted account (should fail)

#### Hierarchy

- [ ] Get account hierarchy (with children)
- [ ] Get account hierarchy (no children)
- [ ] Get account hierarchy (nested children)

### API Testing Examples

#### Using cURL

```bash
# List accounts
curl -X GET "https://api.bkeep.ca/api/v1/chart-of-accounts?accountType=asset&isActive=true" \
  -H "Authorization: Bearer <access_token>"

# Create account
curl -X POST "https://api.bkeep.ca/api/v1/chart-of-accounts" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Cash",
    "accountType": "asset",
    "accountSubtype": "current_asset",
    "openingBalance": 50000.00
  }'

# Update account
curl -X PUT "https://api.bkeep.ca/api/v1/chart-of-accounts/<account_id>" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Cash - Main Account",
    "description": "Updated description"
  }'

# Delete account
curl -X DELETE "https://api.bkeep.ca/api/v1/chart-of-accounts/<account_id>" \
  -H "Authorization: Bearer <access_token>"
```

#### Using Postman

1. **Create Collection**: Create a new Postman collection for Chart of Accounts
2. **Set Variables**: Set `base_url` and `access_token` as collection variables
3. **Create Requests**:
   - GET `{{base_url}}/chart-of-accounts`
   - GET `{{base_url}}/chart-of-accounts/hierarchy`
   - GET `{{base_url}}/chart-of-accounts/:id`
   - POST `{{base_url}}/chart-of-accounts`
   - PUT `{{base_url}}/chart-of-accounts/:id`
   - DELETE `{{base_url}}/chart-of-accounts/:id`
   - PATCH `{{base_url}}/chart-of-accounts/:id/activate`
   - PATCH `{{base_url}}/chart-of-accounts/:id/deactivate`
   - PATCH `{{base_url}}/chart-of-accounts/:id/restore`
4. **Set Authorization**: Use Bearer Token for all requests
5. **Test Scenarios**: Test all validation rules and error cases

---

## Migration Guide

### Running the Migration

The Chart of Accounts migration is tenant-specific and should be run in each tenant schema:

```bash
# Run migration for a specific tenant schema
knex migrate:latest --knexfile src/database/knexfile.ts --migrations-directory src/database/migrations/tenant
```

**Note**: The migration file is located at:
```
src/database/migrations/tenant/20251204134147_create_chart_of_accounts_table.ts
```

### Migration Steps

1. **Ensure Tenant Schema Exists**: The tenant schema must exist before running the migration
2. **Run Migration**: Execute the migration command for the tenant schema
3. **Verify Table**: Confirm that `chart_of_accounts` table exists in the tenant schema
4. **Verify Indexes**: Confirm that all indexes are created
5. **Verify Constraints**: Confirm that unique constraints and foreign keys are in place

### Rollback

To rollback the migration:

```bash
knex migrate:rollback --knexfile src/database/knexfile.ts --migrations-directory src/database/migrations/tenant
```

**Warning**: Rolling back will drop the `chart_of_accounts` table and all data will be lost. Only rollback in development or if absolutely necessary.

### Post-Migration

After running the migration:

1. **Create Default Accounts**: Consider creating default accounts for each account type
2. **Set Opening Balances**: Set opening balances for existing accounts if migrating from another system
3. **Link Bank Accounts**: Link chart accounts to bank accounts if applicable
4. **Verify Data**: Verify that all accounts are properly created and relationships are correct

---

## Future Enhancements

### Planned Features

1. **Account Templates**
   - Pre-defined account templates for different industries
   - Quick setup for new tenants

2. **Account Number Customization**
   - Custom account number ranges per tenant
   - Custom numbering schemes

3. **Account Merging**
   - Merge two accounts into one
   - Transfer balance and transactions

4. **Account History**
   - Track all changes to accounts
   - Audit trail for account modifications

5. **Account Budgets**
   - Set budgets for expense accounts
   - Track budget vs. actual

6. **Account Tags**
   - Add tags to accounts for better organization
   - Filter by tags

7. **Account Permissions**
   - Restrict access to specific accounts
   - Role-based account access

8. **Account Reconciliation**
   - Reconcile accounts with bank statements
   - Mark transactions as reconciled

9. **Account Reports**
   - Account balance history
   - Account activity report
   - Account summary report

10. **Multi-Currency Support**
    - Full multi-currency support for accounts
    - Currency conversion for reporting

### Integration Opportunities

1. **Journal Entries**: Already integrated - journal entries update account balances
2. **Transactions**: Transactions will reference chart of accounts
3. **Invoices**: Invoices will use revenue accounts
4. **Bills**: Bills will use expense accounts
5. **Bank Feeds**: Bank feeds will link to chart accounts
6. **Financial Reports**: Balance Sheet, Income Statement, Trial Balance

---

## Related Documentation

- **[Journal Entries](./JOURNAL_ENTRIES.md)**: Journal entries update chart of account balances
- **[Transactions](./TRANSACTIONS_IMPLEMENTATION.md)**: Transactions reference chart of accounts
- **[Multi-Tenancy](./MULTI_TENANCY.md)**: Tenant-specific schema isolation
- **[Database Schema](./DATABASE_SCHEMA.md)**: Overall database structure
- **[API Architecture](./API_ARCHITECTURE.md)**: API design patterns and conventions

---

## Troubleshooting

### Common Issues

#### Issue: Account number already exists

**Cause**: Account number must be unique per tenant.

**Solution**: 
- Use a different account number
- Let the system auto-generate the account number
- Check if a soft-deleted account with the same number exists

#### Issue: Cannot delete account with children

**Cause**: Accounts with sub-accounts cannot be deleted.

**Solution**:
- Delete or move all child accounts first
- Or remove the parent relationship from child accounts

#### Issue: Cannot modify system account

**Cause**: System accounts are protected from modification.

**Solution**:
- Only modify non-system accounts
- Contact administrator if system account modification is required

#### Issue: Parent account type mismatch

**Cause**: Parent account type must match child account type.

**Solution**:
- Ensure parent and child have the same account type
- Or remove the parent relationship

#### Issue: Account balance not updating

**Cause**: Account balances are updated when journal entries are posted.

**Solution**:
- Ensure journal entries are posted (not just saved as draft)
- Check that journal entry lines reference the correct account
- Verify that journal entries are balanced (debits = credits)

---

## Summary

Chart of Accounts is the foundation of the accounting system in BKeep. It provides:

- ✅ Complete account management (CRUD operations)
- ✅ Automatic account numbering
- ✅ Hierarchical account structure
- ✅ Balance tracking
- ✅ Integration with journal entries
- ✅ Bank account linking
- ✅ Tax tracking support
- ✅ Multi-currency support
- ✅ System account protection
- ✅ Comprehensive validation and error handling

This feature is essential for proper double-entry bookkeeping and financial reporting.

