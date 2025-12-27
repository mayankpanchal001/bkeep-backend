"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaxExemptionActivationStatus = exports.restoreTaxExemption = exports.deleteTaxExemption = exports.updateTaxExemption = exports.createTaxExemption = exports.isContactExemptFromTax = exports.findTaxExemptionsByContact = exports.findTaxExemptionById = exports.findTaxExemptions = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const TaxExemption_1 = require("../models/TaxExemption");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
const tenantQuery_1 = require("../utils/tenantQuery");
/**
 * Map sort field to database column
 */
const mapTaxExemptionSortField = (field) => {
    const fieldMap = {
        exemptionType: "exemption_type",
        certificateExpiry: "certificate_expiry",
        isActive: "is_active",
        createdAt: "created_at",
        updatedAt: "updated_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "created_at";
};
/**
 * Find tax exemptions with pagination, sorting, search, and filtering
 */
const findTaxExemptions = async (tenantId, schemaName, filters) => {
    const { page, limit, sort = "createdAt", order = "asc", search, isActive, contactId, taxId, exemptionType, expired, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapTaxExemptionSortField(sort);
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Build base query
        let query = TaxExemption_1.TaxExemption.query(trx).modify("notDeleted");
        // Filter by tenant
        query = query.modify("byTenant", tenantId);
        // Apply contact filter if provided
        if (contactId) {
            query = query.modify("byContact", contactId);
        }
        // Apply tax filter if provided
        if (taxId) {
            query = query.modify("byTax", taxId);
        }
        // Apply exemption type filter if provided
        if (exemptionType) {
            query = query.where("exemption_type", exemptionType);
        }
        // Apply active filter if provided
        if (isActive !== undefined) {
            if (isActive) {
                query = query.modify("active");
            }
            else {
                query = query.where("is_active", false);
            }
        }
        // Apply expired filter if provided
        if (expired !== undefined) {
            if (expired) {
                query = query.where("certificate_expiry", "<", new Date());
            }
            else {
                query = query.modify("notExpired");
            }
        }
        // Apply search if provided (searches in certificate number and reason)
        if (search) {
            query = query.where((builder) => {
                builder
                    .where("certificate_number", "ilike", `%${search}%`)
                    .orWhere("reason", "ilike", `%${search}%`);
            });
        }
        // Get total count before pagination
        const total = await query.resultSize();
        // Apply pagination and sorting
        const taxExemptions = await query
            .withGraphFetched("tax")
            .orderBy(sortColumn, order)
            .limit(limit)
            .offset(offset);
        return { taxExemptions, total };
    });
};
exports.findTaxExemptions = findTaxExemptions;
/**
 * Find tax exemption by ID
 */
const findTaxExemptionById = async (tenantId, schemaName, taxExemptionId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const taxExemption = await TaxExemption_1.TaxExemption.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxExemptionId)
            .withGraphFetched("tax");
        if (!taxExemption) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_EXEMPTION_NOT_FOUND);
        }
        return taxExemption;
    });
};
exports.findTaxExemptionById = findTaxExemptionById;
/**
 * Find tax exemptions by contact
 */
const findTaxExemptionsByContact = async (tenantId, schemaName, contactId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        return TaxExemption_1.TaxExemption.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("byContact", contactId)
            .modify("active")
            .modify("notExpired")
            .withGraphFetched("tax")
            .orderBy("created_at", "desc");
    });
};
exports.findTaxExemptionsByContact = findTaxExemptionsByContact;
/**
 * Check if contact is exempt from a specific tax
 */
const isContactExemptFromTax = async (tenantId, schemaName, contactId, taxId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const exemption = await TaxExemption_1.TaxExemption.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("byContact", contactId)
            .modify("active")
            .modify("notExpired")
            .where((builder) => {
            builder.whereNull("tax_id").orWhere("tax_id", taxId);
        })
            .first();
        return exemption !== undefined;
    });
};
exports.isContactExemptFromTax = isContactExemptFromTax;
/**
 * Create tax exemption
 */
const createTaxExemption = async (tenantId, schemaName, data, createdBy) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Validate tax exists if taxId is provided
        if (data.taxId) {
            const { findTaxById } = await Promise.resolve().then(() => __importStar(require("./tax.queries")));
            await findTaxById(tenantId, schemaName, data.taxId, trx);
        }
        // Create tax exemption
        const taxExemption = await TaxExemption_1.TaxExemption.query(trx).insertAndFetch({
            tenantId,
            contactId: data.contactId,
            taxId: data.taxId ?? null,
            exemptionType: data.exemptionType,
            certificateNumber: data.certificateNumber ?? null,
            certificateExpiry: data.certificateExpiry
                ? new Date(data.certificateExpiry)
                : null,
            reason: data.reason ?? null,
            isActive: data.isActive ?? true,
            createdBy,
        });
        // Reload with tax relation
        return (0, exports.findTaxExemptionById)(tenantId, schemaName, taxExemption.id);
    });
};
exports.createTaxExemption = createTaxExemption;
/**
 * Update tax exemption
 */
const updateTaxExemption = async (tenantId, schemaName, taxExemptionId, data) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify tax exemption exists
        await (0, exports.findTaxExemptionById)(tenantId, schemaName, taxExemptionId);
        // Validate tax exists if taxId is provided
        if (data.taxId !== undefined && data.taxId !== null) {
            const { findTaxById } = await Promise.resolve().then(() => __importStar(require("./tax.queries")));
            await findTaxById(tenantId, schemaName, data.taxId, trx);
        }
        // Update tax exemption
        const updateData = {};
        if (data.taxId !== undefined)
            updateData.taxId = data.taxId;
        if (data.exemptionType !== undefined)
            updateData.exemptionType = data.exemptionType;
        if (data.certificateNumber !== undefined)
            updateData.certificateNumber = data.certificateNumber ?? null;
        if (data.certificateExpiry !== undefined)
            updateData.certificateExpiry = data.certificateExpiry
                ? new Date(data.certificateExpiry)
                : null;
        if (data.reason !== undefined)
            updateData.reason = data.reason ?? null;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        await TaxExemption_1.TaxExemption.query(trx).findById(taxExemptionId).patch(updateData);
        // Reload
        return (0, exports.findTaxExemptionById)(tenantId, schemaName, taxExemptionId);
    });
};
exports.updateTaxExemption = updateTaxExemption;
/**
 * Delete tax exemption (soft delete)
 */
const deleteTaxExemption = async (tenantId, schemaName, taxExemptionId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify tax exemption exists
        await (0, exports.findTaxExemptionById)(tenantId, schemaName, taxExemptionId);
        // Soft delete
        await trx("tax_exemptions")
            .where("id", taxExemptionId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: (0, date_1.getCurrentDate)(),
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload without notDeleted modifier
        const deletedExemption = await TaxExemption_1.TaxExemption.query(trx).findById(taxExemptionId);
        return deletedExemption;
    });
};
exports.deleteTaxExemption = deleteTaxExemption;
/**
 * Restore tax exemption
 */
const restoreTaxExemption = async (tenantId, schemaName, taxExemptionId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Find deleted tax exemption
        const taxExemption = await TaxExemption_1.TaxExemption.query(trx)
            .modify("deleted")
            .modify("byTenant", tenantId)
            .findById(taxExemptionId);
        if (!taxExemption) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_EXEMPTION_NOT_FOUND);
        }
        // Restore
        await trx("tax_exemptions")
            .where("id", taxExemptionId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: null,
            updated_at: (0, date_1.getCurrentDate)(),
            is_active: true,
        });
        // Reload
        return (0, exports.findTaxExemptionById)(tenantId, schemaName, taxExemptionId);
    });
};
exports.restoreTaxExemption = restoreTaxExemption;
/**
 * Update tax exemption activation status
 */
const updateTaxExemptionActivationStatus = async (tenantId, schemaName, taxExemptionId, isActive) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify tax exemption exists
        await (0, exports.findTaxExemptionById)(tenantId, schemaName, taxExemptionId);
        // Update status
        await TaxExemption_1.TaxExemption.query(trx).findById(taxExemptionId).patch({
            isActive,
        });
        // Reload
        return (0, exports.findTaxExemptionById)(tenantId, schemaName, taxExemptionId);
    });
};
exports.updateTaxExemptionActivationStatus = updateTaxExemptionActivationStatus;
