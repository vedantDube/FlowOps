const express = require("express");
const router = express.Router();
const {
  getPRCycleTime,
  getReviewLatency,
  getCommitActivity,
  getCodeChurn,
  getTopContributors,
  getDeploymentFrequency,
  getLeadTimeForChanges,
  getChangeFailureRate,
  getMTTR,
  getPRFlow,
  getWorkPatterns,
} = require("../controllers/metrics.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { metricsQuery, metricsWithLimitQuery } = require("../utils/validators");

router.use(requireAuth);

router.get("/pr-cycle-time", validate({ query: metricsQuery }), getPRCycleTime);
router.get("/review-latency", validate({ query: metricsQuery }), getReviewLatency);
router.get("/commit-activity", validate({ query: metricsQuery }), getCommitActivity);
router.get("/code-churn", validate({ query: metricsQuery }), getCodeChurn);
router.get("/top-contributors", validate({ query: metricsWithLimitQuery }), getTopContributors);
router.get("/pr-flow", validate({ query: metricsQuery }), getPRFlow);
router.get("/work-patterns", validate({ query: metricsQuery }), getWorkPatterns);

// ── DORA metrics ──────────────────────────────────────────────────────────────
router.get("/deployment-frequency", validate({ query: metricsQuery }), getDeploymentFrequency);
router.get("/lead-time", validate({ query: metricsQuery }), getLeadTimeForChanges);
router.get("/change-failure-rate", validate({ query: metricsQuery }), getChangeFailureRate);
router.get("/mttr", validate({ query: metricsQuery }), getMTTR);

module.exports = router;
