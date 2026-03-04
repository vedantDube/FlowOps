const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { getUsageSummary, getUsageHistory } = require("../controllers/usage.controller");

router.get("/:orgId/summary", authenticate, getUsageSummary);
router.get("/:orgId/history", authenticate, getUsageHistory);

module.exports = router;
