const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createApiKeyBody } = require("../utils/validators");
const { createApiKey, listApiKeys, revokeApiKey } = require("../controllers/api-keys.controller");

router.post("/:orgId", requireAuth, requireAdmin, validate({ body: createApiKeyBody }), createApiKey);
router.get("/:orgId", requireAuth, listApiKeys);
router.delete("/:orgId/:keyId", requireAuth, requireAdmin, revokeApiKey);

module.exports = router;
