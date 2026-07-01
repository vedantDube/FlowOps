const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const { listRules, upsertRule, triggerScan, getImpact } = require("../controllers/automation-rules.controller");

router.get("/:orgId", requireAuth, listRules);
router.put("/:orgId", requireAuth, requireAdmin, upsertRule);
router.post("/:orgId/scan", requireAuth, requireAdmin, triggerScan);
router.get("/:orgId/impact", requireAuth, getImpact);

module.exports = router;
