"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaxStatus = exports.getTaxStatistics = exports.findActiveTaxes = exports.updateTaxActivationStatus = exports.restoreTax = exports.deleteTax = exports.updateTax = exports.createTax = exports.findTaxById = exports.findTaxes = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const Tax_1 = require("../models/Tax");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
const tenantQuery_1 = require("../utils/tenantQuery");
/**
 * Map sort field to database column
 */
const mapTaxSortField = (field) => {
    const fieldMap = {
        name: "name",
        type: "type",
        rate: "rate",
        isActive: "is_active",
        createdAt: "created_at",
        updatedAt: "updated_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "name";
};
/**
 * Find taxes with pagination, sorting, search, and filtering
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param filters - Filter, pagination, and sorting parameters
 * @returns Object containing taxes array and total count
 */
const findTaxes = async (tenantId, schemaName, filters) => {
    const { page, limit, sort = "name", order = "asc", search, isActive, type, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapTaxSortField(sort);
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Build base query
        let query = Tax_1.Tax.query(trx).modify("notDeleted");
        // Filter by tenant
        query = query.modify("byTenant", tenantId);
        // Apply active filter if provided
        if (isActive !== undefined) {
            if (isActive) {
                query = query.modify("active");
            }
            else {
                query = query.where("is_active", false);
            }
        }
        // Apply type filter if provided
        if (type) {
            query = query.modify("byType", type);
        }
        // Apply search if provided
        if (search) {
            query = query.where("name", "ilike", `%${search}%`);
        }
        // Get total count before pagination
        const total = await query.resultSize();
        // Apply pagination and sorting
        const taxes = await query
            .orderBy(sortColumn, order)
            .limit(limit)
            .offset(offset);
        return { taxes, total };
    });
};
exports.findTaxes = findTaxes;
/**
 * Find tax by ID
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Tax object
 * @throws ApiError if tax not found
 */
const findTaxById = async (tenantId, schemaName, taxId, trx) => {
    const execute = async (transaction) => {
        const tax = await Tax_1.Tax.query(transaction)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxId);
        if (!tax) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_NOT_FOUND);
        }
        return tax;
    };
    if (trx) {
        return execute(trx);
    }
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.findTaxById = findTaxById;
/**
 * Create a new tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param data - Tax data
 * @param createdBy - User ID who created the tax
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Created tax object
 */
const createTax = async (tenantId, schemaName, data, createdBy, trx) => {
    const execute = async (transaction) => {
        return Tax_1.Tax.query(transaction).insert({
            ...data,
            tenantId,
            createdBy,
            isActive: data.isActive ?? true,
        });
    };
    if (trx) {
        return execute(trx);
    }
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.createTax = createTax;
/**
 * Update a tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @param data - Tax data to update
 * @param trx - Optional transaction to use (if provided, won't create a new transaction)
 * @returns Updated tax object
 * @throws ApiError if tax not found
 */
const updateTax = async (tenantId, schemaName, taxId, data, trx) => {
    const execute = async (transaction) => {
        // Verify tax exists and belongs to tenant
        await (0, exports.findTaxById)(tenantId, schemaName, taxId, transaction);
        // Update tax
        return Tax_1.Tax.query(transaction).patchAndFetchById(taxId, data);
    };
    if (trx) {
        return execute(trx);
    }
    return (0, tenantQuery_1.withTenantSchema)(schemaName, execute);
};
exports.updateTax = updateTax;
/**
 * Soft delete a tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @returns Deleted tax object
 * @throws ApiError if tax not found
 */
const deleteTax = async (tenantId, schemaName, taxId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify tax exists and belongs to tenant
        await (0, exports.findTaxById)(tenantId, schemaName, taxId, trx);
        // Soft delete using direct Knex update
        await trx("taxes").where("id", taxId).where("tenant_id", tenantId).update({
            deleted_at: (0, date_1.getCurrentDate)(),
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload tax to get updated deleted_at
        const deletedTax = await Tax_1.Tax.query(trx).findById(taxId);
        if (!deletedTax) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_NOT_FOUND);
        }
        return deletedTax;
    });
};
exports.deleteTax = deleteTax;
/**
 * Restore a soft-deleted tax
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @returns Restored tax object
 * @throws ApiError if tax not found or not deleted
 */
const restoreTax = async (tenantId, schemaName, taxId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Find tax (including deleted ones)
        const tax = await Tax_1.Tax.query(trx)
            .modify("byTenant", tenantId)
            .findById(taxId);
        if (!tax) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_NOT_FOUND);
        }
        if (!tax.deletedAt) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.TAX_NOT_DELETED);
        }
        // Tax is deleted, proceed with restoration
        // Restore using direct Knex update
        await trx("taxes").where("id", taxId).where("tenant_id", tenantId).update({
            deleted_at: null,
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload tax
        const restoredTax = await Tax_1.Tax.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxId);
        if (!restoredTax) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_NOT_FOUND);
        }
        return restoredTax;
    });
};
exports.restoreTax = restoreTax;
/**
 * Update tax activation status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @param isActive - New activation status
 * @returns Updated tax object
 * @throws ApiError if tax not found
 */
const updateTaxActivationStatus = async (tenantId, schemaName, taxId, isActive) => {
    return (0, exports.updateTax)(tenantId, schemaName, taxId, { isActive });
};
exports.updateTaxActivationStatus = updateTaxActivationStatus;
/**
 * Find active taxes
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @returns Array of active taxes
 */
const findActiveTaxes = async (tenantId, schemaName) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        return Tax_1.Tax.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("active")
            .orderBy("name", "asc");
    });
};
exports.findActiveTaxes = findActiveTaxes;
/**
 * Get tax statistics
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @returns Tax statistics including counts, type distribution, and recent taxes
 */
const getTaxStatistics = async (tenantId, schemaName) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Base query
        const baseQuery = Tax_1.Tax.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId);
        // Get total count
        const total = await baseQuery.clone().resultSize();
        // Get active count
        const active = await baseQuery.clone().modify("active").resultSize();
        // Get inactive count
        const inactive = total - active;
        // Get counts by type
        const normalCount = await baseQuery
            .clone()
            .modify("byType", Tax_1.TaxType.NORMAL)
            .resultSize();
        const compoundCount = await baseQuery
            .clone()
            .modify("byType", Tax_1.TaxType.COMPOUND)
            .resultSize();
        const withholdingCount = await baseQuery
            .clone()
            .modify("byType", Tax_1.TaxType.WITHHOLDING)
            .resultSize();
        // Get average rate
        const ratesResult = await baseQuery
            .clone()
            .select(trx.raw("AVG(rate) as avg_rate"))
            .first();
        const averageRate = ratesResult
            ? Number.parseFloat(String(ratesResult
                .avg_rate ?? "0"))
            : 0;
        // Get recent taxes (last 5 created)
        const recentTaxesData = await baseQuery
            .clone()
            .orderBy("created_at", "desc")
            .limit(5)
            .select("id", "name", "type", "rate", "is_active as isActive", "created_at as createdAt");
        const recentTaxes = recentTaxesData.map((tax) => ({
            id: tax.id,
            name: tax.name,
            type: tax.type,
            rate: tax.rate,
            isActive: tax.isActive,
            createdAt: tax.createdAt,
        }));
        return {
            total,
            active,
            inactive,
            byType: {
                normal: normalCount,
                compound: compoundCount,
                withholding: withholdingCount,
            },
            averageRate: Number.parseFloat(averageRate.toFixed(2)),
            recentTaxes,
        };
    });
};
exports.getTaxStatistics = getTaxStatistics;
/**
 * Get tax status
 * @param tenantId - Tenant ID from JWT token
 * @param schemaName - Tenant schema name (from tenant context)
 * @param taxId - Tax ID (UUID)
 * @returns Tax status information
 * @throws ApiError if tax not found
 */
const getTaxStatus = async (tenantId, schemaName, taxId) => {
    const tax = await (0, exports.findTaxById)(tenantId, schemaName, taxId);
    return {
        id: tax.id,
        name: tax.name,
        type: tax.type,
        rate: tax.rate,
        isActive: tax.isActive,
        createdAt: tax.createdAt,
        updatedAt: tax.updatedAt,
    };
};
exports.getTaxStatus = getTaxStatus;
