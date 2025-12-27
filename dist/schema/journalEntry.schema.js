"use strict";
/**
 * Journal Entry Schema
 * Zod validation schemas for journal entry-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateJournalEntrySchema = exports.reverseJournalEntrySchema = exports.voidJournalEntrySchema = exports.postJournalEntrySchema = exports.updateJournalEntrySchema = exports.createJournalEntrySchema = exports.journalEntryIdSchema = exports.journalEntryListSchema = exports.journalEntryLineSchema = exports.JOURNAL_ENTRY_SORT_FIELDS = void 0;
const zod_1 = require("zod");
const shared_schema_1 = require("./shared.schema");
/**
 * Valid sort fields for journal entries
 */
exports.JOURNAL_ENTRY_SORT_FIELDS = [
    "entryNumber",
    "entryDate",
    "entryType",
    "status",
    "totalDebit",
    "totalCredit",
    "createdAt",
    "updatedAt",
];
/**
 * Journal entry line schema
 */
exports.journalEntryLineSchema = zod_1.z
    .object({
    accountId: zod_1.z.string().uuid({ message: "Invalid account ID format" }),
    lineNumber: zod_1.z
        .number({ message: "Line number must be a number" })
        .int({ message: "Line number must be an integer" })
        .min(1, { message: "Line number must be at least 1" }),
    debit: zod_1.z
        .number({ message: "Debit must be a number" })
        .nonnegative({ message: "Debit must be non-negative" })
        .default(0),
    credit: zod_1.z
        .number({ message: "Credit must be a number" })
        .nonnegative({ message: "Credit must be non-negative" })
        .default(0),
    description: zod_1.z.string().optional(),
    memo: zod_1.z.string().optional(),
    contactId: zod_1.z
        .string()
        .uuid({ message: "Invalid contact ID format" })
        .optional(),
})
    .refine((data) => {
    // Must have either debit or credit, but not both
    const hasDebit = data.debit > 0;
    const hasCredit = data.credit > 0;
    return hasDebit !== hasCredit;
}, {
    message: "Line must have either debit or credit, but not both",
});
/**
 * Journal entry list query schema
 */
exports.journalEntryListSchema = shared_schema_1.paginationSortingSearchSchema.extend({
    sort: zod_1.z.enum(exports.JOURNAL_ENTRY_SORT_FIELDS).optional().default("entryDate"),
    status: zod_1.z.enum(["draft", "posted", "voided"]).optional(),
    entryType: zod_1.z
        .enum(["standard", "adjusting", "closing", "reversing"])
        .optional(),
    startDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid start date format. Expected YYYY-MM-DD",
    })
        .optional(),
    endDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid end date format. Expected YYYY-MM-DD",
    })
        .optional(),
    sourceModule: zod_1.z.string().max(100).optional(),
});
/**
 * Journal entry ID schema
 * Validates UUID format for journal entry ID
 */
exports.journalEntryIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid journal entry ID format" }),
});
/**
 * Create journal entry schema
 */
exports.createJournalEntrySchema = zod_1.z
    .object({
    entryNumber: zod_1.z
        .string()
        .max(100, { message: "Entry number must be at most 100 characters" })
        .optional(),
    entryDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid entry date format. Expected YYYY-MM-DD",
    }),
    entryType: zod_1.z
        .enum(["standard", "adjusting", "closing", "reversing"], {
        message: "Invalid entry type",
    })
        .optional()
        .default("standard"),
    isAdjusting: zod_1.z.boolean().optional().default(false),
    isClosing: zod_1.z.boolean().optional().default(false),
    isReversing: zod_1.z.boolean().optional().default(false),
    reversalDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid reversal date format. Expected YYYY-MM-DD",
    })
        .nullable()
        .optional(),
    description: zod_1.z.string().optional(),
    reference: zod_1.z
        .string()
        .max(255, { message: "Reference must be at most 255 characters" })
        .optional(),
    memo: zod_1.z.string().optional(),
    sourceModule: zod_1.z.string().max(100).optional(),
    sourceId: zod_1.z
        .string()
        .uuid({ message: "Invalid source ID format" })
        .optional(),
    lines: zod_1.z
        .array(exports.journalEntryLineSchema)
        .min(2, { message: "Journal entry must have at least 2 lines" }),
})
    .refine((data) => {
    // Validate that debits equal credits
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
}, {
    message: "Total debits must equal total credits",
    path: ["lines"],
});
/**
 * Update journal entry schema
 */
exports.updateJournalEntrySchema = zod_1.z.object({
    entryNumber: zod_1.z
        .string()
        .max(100, { message: "Entry number must be at most 100 characters" })
        .optional(),
    entryDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid entry date format. Expected YYYY-MM-DD",
    })
        .optional(),
    entryType: zod_1.z
        .enum(["standard", "adjusting", "closing", "reversing"], {
        message: "Invalid entry type",
    })
        .optional(),
    isAdjusting: zod_1.z.boolean().optional(),
    isClosing: zod_1.z.boolean().optional(),
    isReversing: zod_1.z.boolean().optional(),
    reversalDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid reversal date format. Expected YYYY-MM-DD",
    })
        .nullable()
        .optional(),
    description: zod_1.z.string().nullable().optional(),
    reference: zod_1.z
        .string()
        .max(255, { message: "Reference must be at most 255 characters" })
        .nullable()
        .optional(),
    memo: zod_1.z.string().nullable().optional(),
    sourceModule: zod_1.z.string().max(100).nullable().optional(),
    sourceId: zod_1.z
        .string()
        .uuid({ message: "Invalid source ID format" })
        .nullable()
        .optional(),
});
/**
 * Post journal entry schema
 */
exports.postJournalEntrySchema = zod_1.z
    .object({
    approved: zod_1.z.boolean().optional().default(false),
    approvedBy: zod_1.z
        .string()
        .uuid({ message: "Invalid approver ID format" })
        .optional(),
})
    .optional();
/**
 * Void journal entry schema
 */
exports.voidJournalEntrySchema = zod_1.z
    .object({
    reason: zod_1.z.string().max(500).optional(),
})
    .optional();
/**
 * Reverse journal entry schema
 */
exports.reverseJournalEntrySchema = zod_1.z.object({
    reversalDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid reversal date format. Expected YYYY-MM-DD",
    })
        .or(zod_1.z.date()),
});
/**
 * Duplicate journal entry schema
 */
exports.duplicateJournalEntrySchema = zod_1.z.object({
    entryDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid entry date format. Expected YYYY-MM-DD",
    })
        .optional(),
    entryNumber: zod_1.z
        .string()
        .max(100, { message: "Entry number must be at most 100 characters" })
        .optional(),
});
