"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxWithGroup = exports.findActiveTaxGroups = exports.updateTaxGroupActivationStatus = exports.restoreTaxGroup = exports.deleteTaxGroup = exports.updateTaxGroup = exports.createTaxGroup = exports.findTaxGroupById = exports.findTaxGroups = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const Tax_1 = require("../models/Tax");
const TaxGroup_1 = require("../models/TaxGroup");
const TaxGroupTax_1 = require("../models/TaxGroupTax");
const shared_schema_1 = require("../schema/shared.schema");
const ApiError_1 = require("../utils/ApiError");
const date_1 = require("../utils/date");
const tenantQuery_1 = require("../utils/tenantQuery");
/**
 * Map sort field to database column
 */
const mapTaxGroupSortField = (field) => {
    const fieldMap = {
        name: "name",
        isActive: "is_active",
        createdAt: "created_at",
        updatedAt: "updated_at",
    };
    // eslint-disable-next-line security/detect-object-injection
    return fieldMap[field] ?? "name";
};
/**
 * Find tax groups with pagination, sorting, search, and filtering
 */
const findTaxGroups = async (tenantId, schemaName, filters) => {
    const { page, limit, sort = "name", order = "asc", search, isActive, } = filters;
    const offset = (0, shared_schema_1.calculateOffset)(page, limit);
    const sortColumn = mapTaxGroupSortField(sort);
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Build base query
        let query = TaxGroup_1.TaxGroup.query(trx).modify("notDeleted");
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
        // Apply search if provided
        if (search) {
            query = query.where("name", "ilike", `%${search}%`);
        }
        // Get total count before pagination
        const total = await query.resultSize();
        // Apply pagination and sorting
        const taxGroups = await query
            .orderBy(sortColumn, order)
            .limit(limit)
            .offset(offset)
            .withGraphFetched("taxes");
        return { taxGroups, total };
    });
};
exports.findTaxGroups = findTaxGroups;
/**
 * Find tax group by ID with taxes
 */
const findTaxGroupById = async (tenantId, schemaName, taxGroupId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const taxGroup = await TaxGroup_1.TaxGroup.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxGroupId)
            .withGraphFetched("taxes");
        if (!taxGroup) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_GROUP_NOT_FOUND);
        }
        return taxGroup;
    });
};
exports.findTaxGroupById = findTaxGroupById;
/**
 * Create tax group with taxes
 */
const createTaxGroup = async (tenantId, schemaName, data, createdBy) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Validate all taxes exist and belong to tenant
        const taxes = await Tax_1.Tax.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .whereIn("id", data.taxIds);
        if (taxes.length !== data.taxIds.length) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.INVALID_TAX_IDS);
        }
        // Create tax group
        const taxGroup = await TaxGroup_1.TaxGroup.query(trx).insertAndFetch({
            tenantId,
            name: data.name,
            description: data.description ?? null,
            isActive: data.isActive ?? true,
            createdBy,
        });
        // Create tax group tax relationships
        const taxGroupTaxes = data.taxIds.map((taxId, index) => ({
            taxGroupId: taxGroup.id,
            taxId,
            orderIndex: index,
        }));
        await TaxGroupTax_1.TaxGroupTax.query(trx).insert(taxGroupTaxes);
        // Reload with taxes
        const reloadedTaxGroup = await TaxGroup_1.TaxGroup.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxGroup.id)
            .withGraphFetched("taxes");
        if (!reloadedTaxGroup) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.TAX_GROUP_NOT_FOUND);
        }
        return reloadedTaxGroup;
    });
};
exports.createTaxGroup = createTaxGroup;
/**
 * Update tax group
 */
const updateTaxGroup = async (tenantId, schemaName, taxGroupId, data) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify tax group exists
        const existingGroup = await TaxGroup_1.TaxGroup.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxGroupId);
        if (!existingGroup) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_GROUP_NOT_FOUND);
        }
        // Update tax group fields
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        if (Object.keys(updateData).length > 0) {
            await TaxGroup_1.TaxGroup.query(trx).findById(taxGroupId).patch(updateData);
        }
        // Update taxes if provided
        if (data.taxIds !== undefined) {
            // Validate all taxes exist and belong to tenant
            const taxes = await Tax_1.Tax.query(trx)
                .modify("notDeleted")
                .modify("byTenant", tenantId)
                .whereIn("id", data.taxIds);
            if (taxes.length !== data.taxIds.length) {
                throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.INVALID_TAX_IDS);
            }
            // Delete existing relationships
            await TaxGroupTax_1.TaxGroupTax.query(trx).where("tax_group_id", taxGroupId).delete();
            // Create new relationships
            const taxGroupTaxes = data.taxIds.map((taxId, index) => ({
                taxGroupId,
                taxId,
                orderIndex: index,
            }));
            await TaxGroupTax_1.TaxGroupTax.query(trx).insert(taxGroupTaxes);
        }
        // Reload with taxes within the same transaction
        const reloadedTaxGroup = await TaxGroup_1.TaxGroup.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxGroupId)
            .withGraphFetched("taxes");
        if (!reloadedTaxGroup) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_GROUP_NOT_FOUND);
        }
        return reloadedTaxGroup;
    });
};
exports.updateTaxGroup = updateTaxGroup;
/**
 * Delete tax group (soft delete)
 */
const deleteTaxGroup = async (tenantId, schemaName, taxGroupId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify tax group exists
        await (0, exports.findTaxGroupById)(tenantId, schemaName, taxGroupId);
        // Soft delete
        await trx("tax_groups")
            .where("id", taxGroupId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: (0, date_1.getCurrentDate)(),
            updated_at: (0, date_1.getCurrentDate)(),
        });
        // Reload without notDeleted modifier
        const deletedGroup = await TaxGroup_1.TaxGroup.query(trx).findById(taxGroupId);
        return deletedGroup;
    });
};
exports.deleteTaxGroup = deleteTaxGroup;
/**
 * Restore tax group
 */
const restoreTaxGroup = async (tenantId, schemaName, taxGroupId) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Find deleted tax group
        const taxGroup = await TaxGroup_1.TaxGroup.query(trx)
            .modify("deleted")
            .modify("byTenant", tenantId)
            .findById(taxGroupId);
        if (!taxGroup) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TAX_GROUP_NOT_FOUND);
        }
        // Restore
        await trx("tax_groups")
            .where("id", taxGroupId)
            .where("tenant_id", tenantId)
            .update({
            deleted_at: null,
            updated_at: (0, date_1.getCurrentDate)(),
            is_active: true,
        });
        // Reload within the same transaction
        const restoredTaxGroup = await TaxGroup_1.TaxGroup.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .findById(taxGroupId)
            .withGraphFetched("taxes");
        if (!restoredTaxGroup) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.TAX_GROUP_NOT_FOUND);
        }
        return restoredTaxGroup;
    });
};
exports.restoreTaxGroup = restoreTaxGroup;
/**
 * Update tax group activation status
 */
const updateTaxGroupActivationStatus = async (tenantId, schemaName, taxGroupId, isActive) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        // Verify tax group exists
        await (0, exports.findTaxGroupById)(tenantId, schemaName, taxGroupId);
        // Update status
        await TaxGroup_1.TaxGroup.query(trx).findById(taxGroupId).patch({
            isActive,
        });
        // Reload
        return (0, exports.findTaxGroupById)(tenantId, schemaName, taxGroupId);
    });
};
exports.updateTaxGroupActivationStatus = updateTaxGroupActivationStatus;
/**
 * Find active tax groups
 */
const findActiveTaxGroups = async (tenantId, schemaName) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        return TaxGroup_1.TaxGroup.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("active")
            .withGraphFetched("taxes")
            .orderBy("name", "asc");
    });
};
exports.findActiveTaxGroups = findActiveTaxGroups;
/**
 * Calculate tax with tax group
 */
const calculateTaxWithGroup = async (tenantId, schemaName, taxGroupId, amount) => {
    const taxGroup = await (0, exports.findTaxGroupById)(tenantId, schemaName, taxGroupId);
    if (!taxGroup.taxes || taxGroup.taxes.length === 0) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.TAX_GROUP_HAS_NO_TAXES);
    }
    const taxAmount = taxGroup.calculateTax(amount);
    const totalAmount = amount + taxAmount;
    const effectiveRate = taxGroup.getEffectiveRate();
    // Build tax breakdown
    let currentAmount = amount;
    const taxBreakdown = taxGroup.taxes.map((tax) => {
        const individualTaxAmount = tax.calculateTax(currentAmount);
        const result = {
            taxId: tax.id,
            taxName: tax.name,
            taxRate: tax.rate,
            taxAmount: individualTaxAmount,
        };
        // For compound taxes, add tax to base for next calculation
        if (tax.type === "compound") {
            currentAmount += individualTaxAmount;
        }
        return result;
    });
    return {
        baseAmount: amount,
        taxAmount,
        totalAmount,
        effectiveRate,
        taxBreakdown,
    };
};
exports.calculateTaxWithGroup = calculateTaxWithGroup;
