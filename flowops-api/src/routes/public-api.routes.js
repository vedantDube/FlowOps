const express = require("express");
const router = express.Router();
const {
  getPRCycleTime,
  getReviewLatency,
  getCommitActivity,
  getCodeChurn,
  getTopContributors,
} = require("../controllers/metrics.controller");
const {
  getDeploymentFrequency,
  getLeadTimeForChanges,
  getChangeFailureRate,
  getMTTR,
} = require("../controllers/metrics.controller");
const { pinOrgToApiKey } = require("../controllers/public-api.controller");
const { requireScope } = require("../middleware/api-key.middleware");
const { validate } = require("../middleware/validate.middleware");
const { metricsQuery, metricsWithLimitQuery } = require("../utils/validators");

/**
 * Public API for customers — authenticated via X-API-Key (see
 * authenticateApiKey in App.js, mounted on /api before this router).
 * Read-only access to the same metrics already shown in-app.
 */
router.use(pinOrgToApiKey);

router.get("/metrics/pr-cycle-time", requireScope("metrics:read"), validate({ query: metricsQuery }), getPRCycleTime);
router.get("/metrics/review-latency", requireScope("metrics:read"), validate({ query: metricsQuery }), getReviewLatency);
router.get("/metrics/commit-activity", requireScope("metrics:read"), validate({ query: metricsQuery }), getCommitActivity);
router.get("/metrics/code-churn", requireScope("metrics:read"), validate({ query: metricsQuery }), getCodeChurn);
router.get("/metrics/leaderboard", requireScope("metrics:read"), validate({ query: metricsWithLimitQuery }), getTopContributors);

router.get("/metrics/deployment-frequency", requireScope("metrics:read"), validate({ query: metricsQuery }), getDeploymentFrequency);
router.get("/metrics/lead-time", requireScope("metrics:read"), validate({ query: metricsQuery }), getLeadTimeForChanges);
router.get("/metrics/change-failure-rate", requireScope("metrics:read"), validate({ query: metricsQuery }), getChangeFailureRate);
router.get("/metrics/mttr", requireScope("metrics:read"), validate({ query: metricsQuery }), getMTTR);

module.exports = router;
