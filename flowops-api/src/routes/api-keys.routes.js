const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const { createApiKey, listApiKeys, revokeApiKey } = require("../controllers/api-keys.controller");

router.post("/:orgId", authenticate, requireAdmin, createApiKey);
router.get("/:orgId", authenticate, listApiKeys);
router.delete("/:orgId/:keyId", authenticate, requireAdmin, revokeApiKey);

module.exports = router;
