"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxExemption = exports.TaxExemptionType = void 0;
const objection_1 = require("objection");
const BaseModel_1 = require("./BaseModel");
const Tax_1 = require("./Tax");
/**
 * Tax Exemption Type Enum
 */
var TaxExemptionType;
(function (TaxExemptionType) {
    TaxExemptionType["RESALE"] = "resale";
    TaxExemptionType["NON_PROFIT"] = "non_profit";
    TaxExemptionType["GOVERNMENT"] = "government";
    TaxExemptionType["OTHER"] = "other";
})(TaxExemptionType || (exports.TaxExemptionType = TaxExemptionType = {}));
/**
 * TaxExemption Model
 * Represents a tax exemption for a contact (customer/vendor)
 */
class TaxExemption extends BaseModel_1.BaseModel {
    static get tableName() {
        return "tax_exemptions";
    }
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: ["tenantId", "createdBy", "contactId", "exemptionType"],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
                contactId: { type: "string", format: "uuid" },
                taxId: { type: ["string", "null"], format: "uuid" },
                exemptionType: {
                    type: "string",
                    enum: ["resale", "non_profit", "government", "other"],
                    default: "resale",
                },
                certificateNumber: { type: ["string", "null"], maxLength: 255 },
                certificateExpiry: { type: ["string", "null"], format: "date" },
                reason: { type: ["string", "null"] },
                isActive: { type: "boolean", default: true },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    // Query modifiers
    static get modifiers() {
        return {
            ...super.modifiers,
            active(query) {
                query.where("is_active", true);
            },
            byTenant(query, tenantId) {
                query.where("tenant_id", tenantId);
            },
            byContact(query, contactId) {
                query.where("contact_id", contactId);
            },
            byTax(query, taxId) {
                query.where("tax_id", taxId);
            },
            notExpired(query) {
                query.where(function () {
                    this.whereNull("certificate_expiry").orWhere("certificate_expiry", ">=", new Date());
                });
            },
        };
    }
    // Relations
    static get relationMappings() {
        return {
            tax: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: Tax_1.Tax,
                join: {
                    from: "tax_exemptions.tax_id",
                    to: "taxes.id",
                },
            },
        };
    }
    /**
     * Check if exemption is expired
     * @returns true if certificate has expired
     */
    isExpired() {
        if (!this.certificateExpiry) {
            return false;
        }
        return new Date(this.certificateExpiry) < new Date();
    }
    /**
     * Check if exemption applies to a specific tax
     * @param taxId - Tax ID to check
     * @returns true if exemption applies (taxId is null = applies to all taxes)
     */
    appliesToTax(taxId) {
        return this.taxId === null || this.taxId === taxId;
    }
}
exports.TaxExemption = TaxExemption;
