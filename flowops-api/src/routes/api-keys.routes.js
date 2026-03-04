const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const { createApiKey, listApiKeys, revokeApiKey } = require("../controllers/api-keys.controller");

router.post("/:orgId", requireAuth, requireAdmin, createApiKey);
router.get("/:orgId", requireAuth, listApiKeys);
router.delete("/:orgId/:keyId", requireAuth, requireAdmin, revokeApiKey);

module.exports = router;
