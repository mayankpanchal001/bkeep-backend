"use strict";
/**
 * Validation Middleware
 * Validates request body, query, and params using Zod schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
/**
 * Validation middleware factory
 * Creates a middleware that validates request data using a Zod schema
 * @param schema - Zod schema to validate against
 * @param source - Where to validate from: 'body', 'query', or 'params'
 * @returns Express middleware
 */
const validate = (schema, source = "body") => {
    return (req, _res, next) => {
        try {
            let data;
            if (source === "body") {
                data = req.body;
            }
            else if (source === "query") {
                data = req.query;
            }
            else {
                data = req.params;
            }
            const validatedData = schema.parse(data);
            // Attach validated data to request
            req.validatedData =
                validatedData;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validate = validate;
