const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { getUsageSummary, getUsageHistory } = require("../controllers/usage.controller");

router.get("/:orgId/summary", requireAuth, getUsageSummary);
router.get("/:orgId/history", requireAuth, getUsageHistory);

module.exports = router;
