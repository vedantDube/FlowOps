const express = require("express");
const router = express.Router();
const {
  getPRCycleTime,
  getReviewLatency,
  getCommitActivity,
  getCodeChurn,
  getTopContributors,
} = require("../controllers/metrics.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/pr-cycle-time", getPRCycleTime);
router.get("/review-latency", getReviewLatency);
router.get("/commit-activity", getCommitActivity);
router.get("/code-churn", getCodeChurn);
router.get("/top-contributors", getTopContributors);

module.exports = router;
