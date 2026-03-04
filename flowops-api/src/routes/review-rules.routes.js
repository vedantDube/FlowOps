const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const { listRules, createRule, updateRule, deleteRule } = require("../controllers/review-rules.controller");

router.get("/:orgId", authenticate, listRules);
router.post("/:orgId", authenticate, requireAdmin, createRule);
router.put("/:orgId/:ruleId", authenticate, requireAdmin, updateRule);
router.delete("/:orgId/:ruleId", authenticate, requireAdmin, deleteRule);

module.exports = router;
