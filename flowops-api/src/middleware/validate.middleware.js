/**
 * Zod validation middleware for Express.
 * Validates req.body, req.query, and/or req.params against a Zod schema.
 */
const { ZodError } = require("zod");

/**
 * Validate request data against Zod schemas.
 * @param {Object} schemas
 * @param {import('zod').ZodSchema} [schemas.body]   – Schema for req.body
 * @param {import('zod').ZodSchema} [schemas.query]  – Schema for req.query
 * @param {import('zod').ZodSchema} [schemas.params] – Schema for req.params
 */
function validate(schemas) {
  return (req, res, next) => {
    const errors = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.body = result.error.flatten().fieldErrors;
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.query = result.error.flatten().fieldErrors;
      } else {
        req.query = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.params = result.error.flatten().fieldErrors;
      } else {
        req.params = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    next();
  };
}

module.exports = { validate };
