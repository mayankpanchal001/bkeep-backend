# Journal Entries Implementation

---

## Overview

Journal Entries are the foundation of double-entry bookkeeping in BKeep. They provide a systematic way to record financial transactions that affect multiple accounts, ensuring that debits always equal credits. This feature is critical for:

- **Proper Accounting**: Enforces double-entry bookkeeping principles
- **General Ledger**: Creates a complete audit trail of all financial transactions
- **Balance Tracking**: Automatically updates Chart of Accounts balances when entries are posted
- **Financial Reporting**: Enables generation of Balance Sheets, Trial Balance, and other financial statements
- **Audit Compliance**: Provides complete transaction history with approval workflows

**Key Benefits:**
- ✅ Automatic balance validation (debits = credits)
- ✅ Automatic Chart of Accounts balance updates on posting
- ✅ Entry number auto-generation
- ✅ Status workflow (draft → posted → voided)
- ✅ Source tracking (manual, invoices, bills, transactions)
- ✅ Approval workflow support
- ✅ Complete audit trail

---

## Flow

### Journal Entry Creation Flow

```
User creates journal entry
  ↓
Entry validated (debits = credits)
  ↓
Entry saved as DRAFT
  ↓
Lines created with accounts
  ↓
Entry ready for review
  ↓
User posts entry
  ↓
COA balances updated
  ↓
Entry status: POSTED
```

### Journal Entry Posting Flow

```
User requests to post entry
  ↓
Entry validated (balanced, has lines)
  ↓
For each line:
  - Get Chart of Account
  - Calculate new balance (debit/credit)
  - Update account balance
  ↓
Entry status updated to POSTED
  ↓
Posted timestamp recorded
  ↓
Entry locked (cannot modify/delete)
```

### Journal Entry Void Flow

```
User voids draft entry
  ↓
Entry status: VOIDED
  ↓
Entry locked (cannot modify/delete)
  ↓
(Note: Posted entries cannot be voided - must reverse instead)
```

### Journal Entry Reverse Flow

```
User requests to reverse posted entry
  ↓
System validates entry is posted (not draft/voided)
  ↓
System checks if already reversed
  ↓
System creates reversing entry:
  - Swaps all debits and credits
  - Sets entryType to REVERSING
  - Links to original via source_id
  ↓
System automatically posts reversing entry
  ↓
COA balances reversed (original amounts undone)
  ↓
Original entry marked as reversed
  ↓
Both entries linked (original → reversing)
```

### Automatic Journal Entry Creation Flow

```
Transaction/Invoice/Bill created
  ↓
System generates journal entry
  ↓
Entry linked to source (sourceModule, sourceId)
  ↓
Entry auto-posted
  ↓
COA balances updated
```

---

## Features Implemented

### ✅ Core Features

1. **Journal Entry Management**
   - Create journal entries with multiple lines
   - Update draft entries
   - Delete draft entries (soft delete)
   - Restore deleted entries
   - View entry details with lines

2. **Balance Validation**
   - Automatic validation that debits equal credits
   - Line validation (each line must have debit OR credit, not both)
   - Minimum 2 lines required per entry
   - Floating-point tolerance (0.01) for rounding differences

3. **Entry Posting**
   - Post draft entries to update COA balances
   - Automatic balance calculation for each account
   - Status change: DRAFT → POSTED
   - Posted entries cannot be modified or deleted

4. **Entry Voiding**
   - Void draft entries (status: VOIDED)
   - Voided entries cannot be modified or deleted
   - Posted entries cannot be voided (must reverse instead)

5. **Entry Reversing**
   - Reverse posted entries to undo their effects
   - Creates a new reversing entry with debits/credits swapped
   - Automatically posts the reversing entry (updates COA balances)
   - Links reversing entry to original via `source_id`
   - Prevents duplicate reversals
   - Only posted entries can be reversed

6. **Entry Numbering**
   - Auto-generation: `JE-YYYY-XXX` (e.g., `JE-2024-001`)
   - Manual entry numbers supported
   - Unique validation per tenant

7. **Entry Types**
   - **Standard**: Regular journal entries
   - **Adjusting**: End-of-period adjustments
   - **Closing**: Year-end closing entries
   - **Reversing**: Reversal entries (auto-created when reversing posted entries)

8. **Source Tracking**
   - Link entries to source documents (invoices, bills, transactions)
   - Track source module and source ID
   - Manual entries (no source)

9. **Approval Workflow**
   - Optional approval before posting
   - Track approver and approval timestamp
   - Support for multi-level approvals (future)

10. **Filtering & Search**
   - Filter by status (draft, posted, voided)
   - Filter by entry type
   - Filter by date range
   - Filter by source module
   - Search by entry number, description, reference

11. **Pagination & Sorting**
    - Paginated list with configurable page size
    - Sort by entry number, date, type, status, totals
    - Ascending/descending order

---

## Database Schema

### Tables

#### 1. `journal_entries` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to `public.tenants` |
| `entry_number` | VARCHAR(100) | Entry number (e.g., JE-2024-001) |
| `entry_date` | TIMESTAMP | Date of the journal entry |
| `entry_type` | VARCHAR(50) | Type: standard, adjusting, closing, reversing |
| `is_adjusting` | BOOLEAN | Whether this is an adjusting entry |
| `is_closing` | BOOLEAN | Whether this is a closing entry |
| `is_reversing` | BOOLEAN | Whether this is a reversing entry |
| `reversal_date` | TIMESTAMP | Date when entry should be reversed |
| `description` | TEXT | Description of the entry |
| `reference` | VARCHAR(255) | External reference number |
| `status` | VARCHAR(50) | Status: draft, posted, voided |
| `source_module` | VARCHAR(100) | Source module (invoices, bills, manual) |
| `source_id` | UUID | ID of source document |
| `total_debit` | DECIMAL(15,4) | Total debit amount (validation) |
| `total_credit` | DECIMAL(15,4) | Total credit amount (validation) |
| `approved_by` | UUID | User who approved (nullable) |
| `approved_at` | TIMESTAMP | Approval timestamp (nullable) |
| `posted_by` | UUID | User who posted (nullable) |
| `posted_at` | TIMESTAMP | Posting timestamp (nullable) |
| `created_by` | UUID | User who created |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp (nullable) |

**Indexes:**
- `(tenant_id, deleted_at)`
- `(tenant_id, entry_date)`
- `(tenant_id, status)`
- `(tenant_id, source_module, source_id)`
- Unique: `(tenant_id, entry_number, deleted_at)`

#### 2. `journal_entry_lines` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to `public.tenants` |
| `journal_entry_id` | UUID | Foreign key to `journal_entries` |
| `account_id` | UUID | Foreign key to `chart_of_accounts` |
| `line_number` | INTEGER | Line order within entry |
| `debit` | DECIMAL(15,4) | Debit amount (default: 0) |
| `credit` | DECIMAL(15,4) | Credit amount (default: 0) |
| `description` | TEXT | Line description |
| `memo` | TEXT | Additional memo/notes |
| `contact_id` | UUID | Customer/vendor (nullable, FK when contacts table exists) |
| `created_by` | UUID | User who created |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- `(tenant_id, journal_entry_id)`
- `(tenant_id, account_id)`
- `(tenant_id, contact_id)`

**Constraints:**
- Each line must have either debit OR credit (not both, not neither)
- `account_id` references `chart_of_accounts` (RESTRICT on delete)
- `journal_entry_id` references `journal_entries` (CASCADE on delete)

### Migration File

**File:** `src/database/migrations/tenant/20251204141342_create_journal_entries_table.ts`

**To Run:**
```bash
pnpm db:migrate:tenant
```

---

## Architecture

### Technology Stack

- **ORM**: Objection.js with Knex query builder
- **Database**: PostgreSQL with tenant-specific schemas
- **Validation**: Zod schemas
- **Models**: `JournalEntry`, `JournalEntryLine`
- **Utilities**: `withTenantSchema()` for tenant queries

### File Structure

```
src/
├── models/
│   ├── JournalEntry.ts              # Journal entry model
│   └── JournalEntryLine.ts          # Journal entry line model
├── types/
│   └── journalEntry.type.ts         # TypeScript types
├── schema/
│   └── journalEntry.schema.ts       # Zod validation schemas
├── queries/
│   └── journalEntry.queries.ts      # Database queries
├── controllers/
│   └── journalEntry.controller.ts   # HTTP request handlers
├── routes/
│   └── journalEntry.route.ts        # Route definitions
└── database/
    └── migrations/
        └── tenant/
            └── 20251204141342_create_journal_entries_table.ts
```

### Design Patterns

1. **Double-Entry Validation**
   - Enforced at schema level (Zod validation)
   - Enforced at model level (`isBalanced()` method)
   - Enforced at query level (before posting)

2. **Balance Updates**
   - COA balances updated atomically during posting
   - Uses `updateBalance()` method from ChartOfAccount model
   - Respects account type (debit/credit accounts)

3. **Status Workflow**
   - DRAFT → Can modify, delete, post, void
   - POSTED → Cannot modify, delete, void (locked)
   - VOIDED → Cannot modify, delete, post (locked)

4. **Soft Deletes**
   - All entries use soft deletes (`deleted_at`)
   - Deleted entries can be restored
   - Posted entries cannot be deleted

---

## API Endpoints

### Base URL

All endpoints are prefixed with `/api/v1/journal-entries`

### Authentication

All endpoints require:
- `Authorization: Bearer <access-token>`
- Tenant context (set via `setTenantContext` middleware)

---

### 1. List Journal Entries

**Endpoint:** `GET /api/v1/journal-entries`

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50, max: 100) - Items per page
- `sort` (string, default: 'entryDate') - Sort field
- `order` (string, default: 'desc') - Sort order (asc/desc)
- `search` (string, optional) - Search in entry number, description, reference
- `status` (string, optional) - Filter by status: draft, posted, voided
- `entryType` (string, optional) - Filter by type: standard, adjusting, closing, reversing
- `startDate` (string, optional) - Filter from date (ISO 8601)
- `endDate` (string, optional) - Filter to date (ISO 8601)
- `sourceModule` (string, optional) - Filter by source module

**Example Request:**
```http
GET /api/v1/journal-entries?page=1&limit=20&status=posted&sort=entryDate&order=desc
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Journal entries fetched successfully",
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "entryNumber": "JE-2024-001",
        "entryDate": "2024-12-01T10:00:00.000Z",
        "entryType": "standard",
        "isAdjusting": false,
        "isClosing": false,
        "isReversing": false,
        "description": "Monthly rent payment",
        "reference": "INV-2024-001",
        "status": "posted",
        "sourceModule": "manual",
        "totalDebit": 5000.00,
        "totalCredit": 5000.00,
        "postedAt": "2024-12-01T10:05:00.000Z",
        "createdAt": "2024-12-01T10:00:00.000Z",
        "updatedAt": "2024-12-01T10:05:00.000Z",
        "lines": [
          {
            "id": "line-uuid-1",
            "accountId": "account-uuid-1",
            "lineNumber": 1,
            "debit": 5000.00,
            "credit": 0.00,
            "description": "Rent expense"
          },
          {
            "id": "line-uuid-2",
            "accountId": "account-uuid-2",
            "lineNumber": 2,
            "debit": 0.00,
            "credit": 5000.00,
            "description": "Cash payment"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

---

### 2. Get Journal Entry by ID

**Endpoint:** `GET /api/v1/journal-entries/:id`

**Path Parameters:**
- `id` (UUID, required) - Journal entry ID

**Example Request:**
```http
GET /api/v1/journal-entries/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Journal entry fetched successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entryNumber": "JE-2024-001",
    "entryDate": "2024-12-01T10:00:00.000Z",
    "entryType": "standard",
    "isAdjusting": false,
    "isClosing": false,
    "isReversing": false,
    "reversalDate": null,
    "description": "Monthly rent payment",
    "reference": "INV-2024-001",
    "status": "posted",
    "sourceModule": "manual",
    "sourceId": null,
    "totalDebit": 5000.00,
    "totalCredit": 5000.00,
    "approvedBy": null,
    "approvedAt": null,
    "postedBy": "user-uuid",
    "postedAt": "2024-12-01T10:05:00.000Z",
    "createdAt": "2024-12-01T10:00:00.000Z",
    "updatedAt": "2024-12-01T10:05:00.000Z",
    "lines": [
      {
        "id": "line-uuid-1",
        "accountId": "account-uuid-1",
        "account": {
          "id": "account-uuid-1",
          "accountNumber": "5100",
          "accountName": "Rent Expense",
          "accountType": "expense"
        },
        "lineNumber": 1,
        "debit": 5000.00,
        "credit": 0.00,
        "description": "Rent expense",
        "memo": null
      },
      {
        "id": "line-uuid-2",
        "accountId": "account-uuid-2",
        "account": {
          "id": "account-uuid-2",
          "accountNumber": "1000",
          "accountName": "Cash",
          "accountType": "asset"
        },
        "lineNumber": 2,
        "debit": 0.00,
        "credit": 5000.00,
        "description": "Cash payment",
        "memo": null
      }
    ]
  }
}
```

---

### 3. Create Journal Entry

**Endpoint:** `POST /api/v1/journal-entries`

**Request Body:**
```json
{
  "entryNumber": "JE-2024-001",  // Optional - auto-generated if not provided
  "entryDate": "2024-12-01T10:00:00.000Z",
  "entryType": "standard",  // Optional, default: "standard"
  "isAdjusting": false,  // Optional, default: false
  "isClosing": false,  // Optional, default: false
  "isReversing": false,  // Optional, default: false
  "reversalDate": null,  // Optional
  "description": "Monthly rent payment",
  "reference": "INV-2024-001",  // Optional
  "sourceModule": "manual",  // Optional
  "sourceId": null,  // Optional
  "lines": [
    {
      "accountId": "account-uuid-1",
      "lineNumber": 1,
      "debit": 5000.00,
      "credit": 0.00,
      "description": "Rent expense",
      "memo": "December rent"  // Optional
    },
    {
      "accountId": "account-uuid-2",
      "lineNumber": 2,
      "debit": 0.00,
      "credit": 5000.00,
      "description": "Cash payment"
    }
  ]
}
```

**Validation Rules:**
- `entryDate` is required (ISO 8601 format)
- `lines` array must have at least 2 items
- Each line must have either `debit` OR `credit` (not both, not neither)
- Total debits must equal total credits (within 0.01 tolerance)
- All `accountId` values must reference existing Chart of Accounts

**Example Request:**
```http
POST /api/v1/journal-entries
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "entryDate": "2024-12-01T10:00:00.000Z",
  "description": "Monthly rent payment",
  "lines": [
    {
      "accountId": "account-uuid-1",
      "lineNumber": 1,
      "debit": 5000.00,
      "credit": 0.00,
      "description": "Rent expense"
    },
    {
      "accountId": "account-uuid-2",
      "lineNumber": 2,
      "debit": 0.00,
      "credit": 5000.00,
      "description": "Cash payment"
    }
  ]
}
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Journal entry created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entryNumber": "JE-2024-001",
    "entryDate": "2024-12-01T10:00:00.000Z",
    "entryType": "standard",
    "status": "draft",
    "totalDebit": 5000.00,
    "totalCredit": 5000.00,
    "createdAt": "2024-12-01T10:00:00.000Z",
    "lines": [
      {
        "id": "line-uuid-1",
        "accountId": "account-uuid-1",
        "lineNumber": 1,
        "debit": 5000.00,
        "credit": 0.00
      },
      {
        "id": "line-uuid-2",
        "accountId": "account-uuid-2",
        "lineNumber": 2,
        "debit": 0.00,
        "credit": 5000.00
      }
    ]
  }
}
```

**Error Responses:**

**400 Bad Request - Entry Not Balanced:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Total debits must equal total credits",
  "data": null
}
```

**400 Bad Request - Invalid Line:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Line must have either debit or credit, but not both",
  "data": null
}
```

**409 Conflict - Entry Number Exists:**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Journal entry number already exists",
  "data": null
}
```

---

### 4. Update Journal Entry

**Endpoint:** `PUT /api/v1/journal-entries/:id`

**Path Parameters:**
- `id` (UUID, required) - Journal entry ID

**Request Body:**
```json
{
  "entryNumber": "JE-2024-001",  // Optional
  "entryDate": "2024-12-01T10:00:00.000Z",  // Optional
  "entryType": "adjusting",  // Optional
  "isAdjusting": true,  // Optional
  "isClosing": false,  // Optional
  "isReversing": false,  // Optional
  "reversalDate": null,  // Optional
  "description": "Updated description",  // Optional
  "reference": "REF-001",  // Optional
  "sourceModule": "invoices",  // Optional
  "sourceId": "invoice-uuid"  // Optional
}
```

**Note:** Only draft entries can be updated. Posted or voided entries cannot be modified.

**Example Request:**
```http
PUT /api/v1/journal-entries/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "description": "Updated monthly rent payment",
  "reference": "UPDATED-REF-001"
}
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Journal entry updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entryNumber": "JE-2024-001",
    "entryDate": "2024-12-01T10:00:00.000Z",
    "entryType": "standard",
    "status": "draft",
    "updatedAt": "2024-12-01T11:00:00.000Z"
  }
}
```

**Error Responses:**

**403 Forbidden - Cannot Modify Posted Entry:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Cannot modify a posted journal entry",
  "data": null
}
```

---

### 5. Post Journal Entry

**Endpoint:** `POST /api/v1/journal-entries/:id/post`

**Path Parameters:**
- `id` (UUID, required) - Journal entry ID

**Request Body (Optional):**
```json
{
  "approved": true,  // Optional, default: false
  "approvedBy": "user-uuid"  // Optional
}
```

**What Happens:**
1. Entry is validated (balanced, has lines)
2. For each line, the Chart of Account balance is updated
3. Entry status changes to POSTED
4. Entry is locked (cannot modify/delete)

**Example Request:**
```http
POST /api/v1/journal-entries/550e8400-e29b-41d4-a716-446655440000/post
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "approved": true
}
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Journal entry posted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entryNumber": "JE-2024-001",
    "status": "posted",
    "postedBy": "user-uuid",
    "postedAt": "2024-12-01T10:05:00.000Z",
    "totalDebit": 5000.00,
    "totalCredit": 5000.00
  }
}
```

**Error Responses:**

**400 Bad Request - Entry Not Balanced:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Journal entry is not balanced (debits must equal credits)",
  "data": null
}
```

**409 Conflict - Already Posted:**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Journal entry is already posted",
  "data": null
}
```

---

### 6. Void Journal Entry

**Endpoint:** `POST /api/v1/journal-entries/:id/void`

**Path Parameters:**
- `id` (UUID, required) - Journal entry ID

**Request Body (Optional):**
```json
{
  "reason": "Entry was created in error"  // Optional
}
```

**Note:** Only draft entries can be voided. Posted entries cannot be voided (must reverse instead).

**Example Request:**
```http
POST /api/v1/journal-entries/550e8400-e29b-41d4-a716-446655440000/void
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "Entry was created in error"
}
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Journal entry voided successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entryNumber": "JE-2024-001",
    "status": "voided",
    "updatedAt": "2024-12-01T11:00:00.000Z"
  }
}
```

**Error Responses:**

**403 Forbidden - Cannot Void Posted Entry:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Cannot void a posted journal entry. Reverse it instead.",
  "data": null
}
```

---

### 7. Reverse Journal Entry

**Endpoint:** `POST /api/v1/journal-entries/:id/reverse`

**Path Parameters:**
- `id` (UUID, required) - Journal entry ID of the posted entry to reverse

**Request Body:**
```json
{
  "reversalDate": "2024-12-31T00:00:00.000Z"  // Required - Date for the reversing entry
}
```

**What Happens:**
1. System validates entry is posted (not draft or voided)
2. System checks if entry has already been reversed
3. System creates a new reversing entry with debits/credits swapped
4. System automatically posts the reversing entry (updates COA balances)
5. Original entry is marked as reversed
6. Reversing entry is linked to original via `source_id`

**Note:** Only posted entries can be reversed. The reversing entry is automatically posted to update Chart of Accounts balances.

**Example Request:**
```http
POST /api/v1/journal-entries/550e8400-e29b-41d4-a716-446655440000/reverse
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reversalDate": "2024-12-31T00:00:00.000Z"
}
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Journal entry reversed successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "entryNumber": "JE-2024-002",
    "entryDate": "2024-12-31T00:00:00.000Z",
    "entryType": "reversing",
    "isReversing": true,
    "reversalDate": "2024-12-31T00:00:00.000Z",
    "description": "Reversal of journal entry JE-2024-001",
    "reference": "Reversal: INV-2024-001",
    "status": "posted",
    "sourceModule": "journal_entries",
    "sourceId": "550e8400-e29b-41d4-a716-446655440000",
    "totalDebit": 5000.00,
    "totalCredit": 5000.00,
    "postedAt": "2024-12-31T00:00:00.000Z",
    "createdAt": "2024-12-31T00:00:00.000Z",
    "lines": [
      {
        "id": "line-uuid-3",
        "accountId": "account-uuid-1",
        "lineNumber": 1,
        "debit": 0.00,
        "credit": 5000.00,
        "description": "Reversal: Rent expense"
      },
      {
        "id": "line-uuid-4",
        "accountId": "account-uuid-2",
        "lineNumber": 2,
        "debit": 5000.00,
        "credit": 0.00,
        "description": "Reversal: Cash payment"
      }
    ]
  }
}
```

**Error Responses:**

**400 Bad Request - Reversal Date Missing:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Reversal date is required",
  "data": null
}
```

**403 Forbidden - Cannot Reverse Draft Entry:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Cannot reverse a draft journal entry. Only posted entries can be reversed.",
  "data": null
}
```

**403 Forbidden - Cannot Reverse Voided Entry:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Cannot reverse a voided journal entry.",
  "data": null
}
```

**409 Conflict - Already Reversed:**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Journal entry has already been reversed",
  "data": null
}
```

---

### 8. Delete Journal Entry

**Endpoint:** `DELETE /api/v1/journal-entries/:id`

**Path Parameters:**
- `id` (UUID, required) - Journal entry ID

**Note:** Only draft entries can be deleted. Posted entries cannot be deleted. This is a soft delete.

**Example Request:**
```http
DELETE /api/v1/journal-entries/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Journal entry deleted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entryNumber": "JE-2024-001",
    "deletedAt": "2024-12-01T11:00:00.000Z"
  }
}
```

**Error Responses:**

**403 Forbidden - Cannot Delete Posted Entry:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Cannot delete a posted journal entry",
  "data": null
}
```

---

### 9. Restore Journal Entry

**Endpoint:** `PATCH /api/v1/journal-entries/:id/restore`

**Path Parameters:**
- `id` (UUID, required) - Journal entry ID

**Example Request:**
```http
PATCH /api/v1/journal-entries/550e8400-e29b-41d4-a716-446655440000/restore
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Journal entry restored successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entryNumber": "JE-2024-001",
    "status": "draft",
    "createdAt": "2024-12-01T10:00:00.000Z",
    "updatedAt": "2024-12-01T12:00:00.000Z"
  }
}
```

---

## Code Examples

### Frontend Integration

#### Create Journal Entry

```typescript
import axios from 'axios'

const createJournalEntry = async (entryData: {
  entryDate: string
  description: string
  lines: Array<{
    accountId: string
    lineNumber: number
    debit?: number
    credit?: number
    description?: string
  }>
}) => {
  const response = await axios.post(
    '/api/v1/journal-entries',
    entryData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data
}

// Example usage
const entry = await createJournalEntry({
  entryDate: new Date().toISOString(),
  description: 'Monthly rent payment',
  lines: [
    {
      accountId: 'rent-expense-account-id',
      lineNumber: 1,
      debit: 5000.00,
      credit: 0,
      description: 'Rent expense',
    },
    {
      accountId: 'cash-account-id',
      lineNumber: 2,
      debit: 0,
      credit: 5000.00,
      description: 'Cash payment',
    },
  ],
})
```

#### Post Journal Entry

```typescript
const postJournalEntry = async (entryId: string, approved: boolean = false) => {
  const response = await axios.post(
    `/api/v1/journal-entries/${entryId}/post`,
    { approved },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data
}

// Example usage
await postJournalEntry('entry-id', true)
```

#### Reverse Journal Entry

```typescript
const reverseJournalEntry = async (
  entryId: string,
  reversalDate: string
) => {
  const response = await axios.post(
    `/api/v1/journal-entries/${entryId}/reverse`,
    { reversalDate },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data
}

// Example usage
const reversedEntry = await reverseJournalEntry(
  'entry-id',
  '2024-12-31T00:00:00.000Z'
)

console.log('Reversing entry created:', reversedEntry.data.entryNumber)
console.log('Original entry ID:', reversedEntry.data.sourceId)
```

#### List Journal Entries

```typescript
const listJournalEntries = async (filters: {
  page?: number
  limit?: number
  status?: 'draft' | 'posted' | 'voided'
  startDate?: string
  endDate?: string
}) => {
  const params = new URLSearchParams()
  if (filters.page) params.append('page', String(filters.page))
  if (filters.limit) params.append('limit', String(filters.limit))
  if (filters.status) params.append('status', filters.status)
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)

  const response = await axios.get(
    `/api/v1/journal-entries?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  return response.data
}

// Example usage
const entries = await listJournalEntries({
  page: 1,
  limit: 20,
  status: 'posted',
  startDate: '2024-12-01T00:00:00.000Z',
  endDate: '2024-12-31T23:59:59.999Z',
})
```

### Backend Integration

#### Create Journal Entry from Transaction

```typescript
import { createJournalEntry } from '@queries/journalEntry.queries'
import { JournalEntryType, JournalEntryStatus } from '@models/JournalEntry'

// Create journal entry for a transaction
const createTransactionJournalEntry = async (
  tenantId: string,
  schemaName: string,
  createdBy: string,
  transactionId: string,
  lines: Array<{
    accountId: string
    debit: number
    credit: number
    description: string
  }>
) => {
  const entry = await createJournalEntry(
    tenantId,
    schemaName,
    createdBy,
    {
      entryDate: new Date(),
      entryType: JournalEntryType.STANDARD,
      description: `Journal entry for transaction ${transactionId}`,
      sourceModule: 'transactions',
      sourceId: transactionId,
      lines: lines.map((line, index) => ({
        accountId: line.accountId,
        lineNumber: index + 1,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
    }
  )

  // Auto-post the entry
  const postedEntry = await postJournalEntry(
    tenantId,
    schemaName,
    entry.id,
    createdBy
  )

  return postedEntry
}
```

#### Validate Entry Before Posting

```typescript
import { findJournalEntryById } from '@queries/journalEntry.queries'

const validateAndPostEntry = async (
  tenantId: string,
  schemaName: string,
  entryId: string,
  postedBy: string
) => {
  // Get entry with lines
  const entry = await findJournalEntryById(tenantId, schemaName, entryId)

  // Validate using model method
  entry.validate() // Throws ApiError if invalid

  // Post entry (also validates internally)
  return await postJournalEntry(tenantId, schemaName, entryId, postedBy)
}
```

---

## Configuration

### Environment Variables

No additional environment variables are required for Journal Entries. The feature uses existing configuration:

- Database connection (from `DATABASE_URL` or `DB_*` variables)
- JWT authentication (from `ACCESS_TOKEN_SECRET`, etc.)
- Tenant context (from existing multi-tenancy setup)

### Entry Number Format

Entry numbers are auto-generated in the format: `JE-YYYY-XXX`

- `JE` - Prefix for Journal Entry
- `YYYY` - Current year (e.g., 2024)
- `XXX` - Sequential number (001, 002, 003, ...)

**Example:** `JE-2024-001`, `JE-2024-002`, `JE-2025-001`

**Customization:** To change the format, modify `generateEntryNumber()` in `src/queries/journalEntry.queries.ts`

---

## Security Considerations

### 1. Authentication & Authorization

- **All endpoints require authentication** via JWT token
- **Tenant isolation** enforced via `withTenantSchema()` utility
- **User context** tracked via `created_by`, `posted_by`, `approved_by`

### 2. Data Validation

- **Balance validation** at multiple levels:
  - Zod schema validation (request level)
  - Model validation (`isBalanced()` method)
  - Query validation (before posting)

- **Line validation**:
  - Each line must have debit OR credit (not both, not neither)
  - Minimum 2 lines required
  - All accounts must exist and belong to tenant

### 3. Status Protection

- **Posted entries** cannot be modified or deleted (but can be reversed)
- **Voided entries** cannot be modified, deleted, posted, or reversed
- **Draft entries** can be modified, deleted, posted, or voided

### 4. Balance Updates

- **Atomic updates** during posting (transaction-safe)
- **Account validation** before balance updates
- **No negative balances** (handled by account type logic)

### 5. Audit Trail

- **Complete history** via `created_at`, `updated_at`, `posted_at`
- **User tracking** via `created_by`, `posted_by`, `approved_by`
- **Soft deletes** preserve audit trail

---

## Testing

### Manual Testing Checklist

#### Create Journal Entry

- [ ] Create entry with 2 lines (debit + credit)
- [ ] Create entry with auto-generated entry number
- [ ] Create entry with manual entry number
- [ ] Verify entry saved as DRAFT
- [ ] Verify totals calculated correctly

#### Validation Tests

- [ ] Try to create entry with unbalanced debits/credits (should fail)
- [ ] Try to create entry with only 1 line (should fail)
- [ ] Try to create entry with line having both debit and credit (should fail)
- [ ] Try to create entry with line having neither debit nor credit (should fail)
- [ ] Try to create entry with duplicate entry number (should fail)

#### Post Entry

- [ ] Post draft entry successfully
- [ ] Verify COA balances updated correctly
- [ ] Verify entry status changed to POSTED
- [ ] Try to post already-posted entry (should fail)
- [ ] Try to post voided entry (should fail)
- [ ] Try to post unbalanced entry (should fail)

#### Update Entry

- [ ] Update draft entry successfully
- [ ] Try to update posted entry (should fail)
- [ ] Try to update voided entry (should fail)

#### Delete Entry

- [ ] Delete draft entry successfully
- [ ] Try to delete posted entry (should fail)
- [ ] Restore deleted entry successfully

#### Void Entry

- [ ] Void draft entry successfully
- [ ] Try to void posted entry (should fail)
- [ ] Try to void already-voided entry (should fail)

#### Reverse Entry

- [ ] Reverse posted entry successfully
- [ ] Verify reversing entry created with swapped debits/credits
- [ ] Verify COA balances reversed correctly
- [ ] Verify original entry marked as reversed
- [ ] Verify reversing entry linked to original via source_id
- [ ] Try to reverse draft entry (should fail)
- [ ] Try to reverse voided entry (should fail)
- [ ] Try to reverse already-reversed entry (should fail)
- [ ] Verify reversing entry is automatically posted

#### List & Filter

- [ ] List all entries with pagination
- [ ] Filter by status (draft, posted, voided)
- [ ] Filter by entry type
- [ ] Filter by date range
- [ ] Search by entry number
- [ ] Search by description
- [ ] Sort by different fields

### API Testing Examples

#### Using cURL

```bash
# Create journal entry
curl -X POST http://localhost:8000/api/v1/journal-entries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entryDate": "2024-12-01T10:00:00.000Z",
    "description": "Test entry",
    "lines": [
      {
        "accountId": "account-uuid-1",
        "lineNumber": 1,
        "debit": 1000.00,
        "credit": 0.00,
        "description": "Debit line"
      },
      {
        "accountId": "account-uuid-2",
        "lineNumber": 2,
        "debit": 0.00,
        "credit": 1000.00,
        "description": "Credit line"
      }
    ]
  }'

# Post entry
curl -X POST http://localhost:8000/api/v1/journal-entries/ENTRY_ID/post \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'

# Reverse entry
curl -X POST http://localhost:8000/api/v1/journal-entries/ENTRY_ID/reverse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reversalDate": "2024-12-31T00:00:00.000Z"}'

# List entries
curl -X GET "http://localhost:8000/api/v1/journal-entries?page=1&limit=20&status=posted" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Common Issues

#### 1. "Journal entry is not balanced"

**Cause:** Total debits do not equal total credits

**Solution:**
- Check that sum of all debits equals sum of all credits
- Verify no rounding errors (tolerance is 0.01)
- Ensure each line has either debit OR credit (not both, not neither)

**Example:**
```typescript
// ❌ WRONG - Unbalanced
lines: [
  { debit: 1000, credit: 0 },
  { debit: 0, credit: 500 }  // Missing 500 credit
]

// ✅ CORRECT - Balanced
lines: [
  { debit: 1000, credit: 0 },
  { debit: 0, credit: 1000 }
]
```

#### 2. "Cannot modify a posted journal entry"

**Cause:** Attempting to update or delete a posted entry

**Solution:**
- Posted entries are locked to maintain data integrity
- Create a reversing entry instead of modifying posted entries
- Only draft entries can be modified

#### 3. "Journal entry number already exists"

**Cause:** Entry number is already in use for this tenant

**Solution:**
- Use auto-generated entry number (omit `entryNumber` field)
- Or use a different entry number
- Check for soft-deleted entries with same number

#### 4. "Chart of account not found"

**Cause:** Account ID in line doesn't exist or doesn't belong to tenant

**Solution:**
- Verify account exists in Chart of Accounts
- Verify account belongs to current tenant
- Check account is not soft-deleted

#### 5. Balance Not Updating After Posting

**Cause:** Entry posted but COA balances unchanged

**Solution:**
- Verify entry was actually posted (check `status` and `postedAt`)
- Check account balances directly in database
- Verify account type logic (debit vs credit accounts)
- Check for transaction rollback errors

#### 6. "Cannot reverse a draft journal entry"

**Cause:** Attempting to reverse a draft entry

**Solution:**
- Only posted entries can be reversed
- Post the entry first, then reverse it
- Draft entries should be voided or deleted instead

#### 7. "Journal entry has already been reversed"

**Cause:** Entry was already reversed previously

**Solution:**
- Check if a reversing entry exists for this entry
- Look for entries with `source_module = 'journal_entries'` and `source_id = <original_entry_id>`
- Each entry can only be reversed once

#### 8. Reversing Entry Not Updating Balances

**Cause:** Reversing entry created but balances not reversed

**Solution:**
- Verify reversing entry was automatically posted (check `status` and `postedAt`)
- Check that reversing entry has swapped debits/credits
- Verify COA balances were updated correctly
- Check for transaction rollback errors

---

## Migration Guide

### Running Migrations

**For New Tenants:**
Migrations run automatically during tenant onboarding via `onboardTenant` service.

**For Existing Tenants:**
```bash
# Run tenant migrations for all tenants
pnpm db:migrate:tenant

# Or run for specific tenant (via script)
# (Note: Custom script may be needed)
```

### Migration File

**File:** `src/database/migrations/tenant/20251204141342_create_journal_entries_table.ts`

**What It Creates:**
- `journal_entries` table
- `journal_entry_lines` table
- Indexes for performance
- Foreign key constraints
- Unique constraints

**Rollback:**
```bash
# Rollback last migration
pnpm db:migrate:rollback
```

### Data Migration

If migrating from another system:

1. **Export Journal Entries** from source system
2. **Transform Data**:
   - Map entry numbers
   - Map account IDs to Chart of Accounts
   - Convert dates to ISO 8601
   - Ensure debits = credits
3. **Import via API** or direct database insert
4. **Verify Balances** match source system

---

## Future Enhancements

### Planned Features

1. **Recurring Journal Entries**
   - Template entries
   - Scheduled posting
   - Auto-generation on schedule

2. **Bulk Operations**
   - Bulk posting
   - Bulk voiding
   - Bulk deletion (draft only)

3. **Advanced Filtering**
   - Filter by account
   - Filter by amount range
   - Filter by approver

4. **Export & Reporting**
   - Export to CSV/Excel
   - General Ledger report
   - Trial Balance report
   - Journal Entry audit report

5. **Approval Workflow**
   - Multi-level approvals
   - Approval routing
   - Approval notifications

6. **Attachments**
   - Attach documents to entries
   - Receipt/image attachments
   - Document storage integration

7. **Integration with Transactions**
   - Auto-create entries from transactions
   - Link transactions to entries
   - Transaction-to-entry mapping

---

## Related Documentation

- [Chart of Accounts Implementation](./CHART_OF_ACCOUNTS_IMPLEMENTATION.md) - COA structure and accounts
- [Transactions Implementation](./TRANSACTIONS_IMPLEMENTATION.md) - Transaction system (will create journal entries)
- [Multi-Tenancy](./MULTI_TENANCY.md) - Tenant context and schema management
- [API Architecture](./API_ARCHITECTURE.md) - General API patterns

---

## Summary

Journal Entries provide the foundation for proper double-entry bookkeeping in BKeep. Key features:

✅ **Complete CRUD operations** for journal entries  
✅ **Automatic balance validation** (debits = credits)  
✅ **Automatic COA balance updates** on posting  
✅ **Status workflow** (draft → posted → voided)  
✅ **Entry reversing** for posted entries (undo effects)  
✅ **Entry number auto-generation**  
✅ **Source tracking** for audit trail  
✅ **Approval workflow support**  
✅ **Complete API** with filtering and search  

**Next Steps:**
1. Run migration: `pnpm db:migrate:tenant`
2. Test API endpoints
3. Integrate with Transactions (auto-create entries)
4. Build financial reports using journal entries

---

**Last Updated:** December 4, 2025  
**Status:** ✅ Complete and Ready for Testing

