const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createReviewRuleBody, updateReviewRuleBody } = require("../utils/validators");
const { listRules, createRule, updateRule, deleteRule } = require("../controllers/review-rules.controller");

router.get("/:orgId", requireAuth, listRules);
router.post("/:orgId", requireAuth, requireAdmin, validate({ body: createReviewRuleBody }), createRule);
router.put("/:orgId/:ruleId", requireAuth, requireAdmin, validate({ body: updateReviewRuleBody }), updateRule);
router.delete("/:orgId/:ruleId", requireAuth, requireAdmin, deleteRule);

module.exports = router;
