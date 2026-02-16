const express = require("express");
const router = express.Router();
const {
  getPRCycleTime,
  getReviewLatency,
  getCommitActivity,
} = require("../controllers/metrics.controller");

router.get("/pr-cycle-time", getPRCycleTime);
router.get("/review-latency", getReviewLatency);
router.get("/commit-activity", getCommitActivity);

module.exports = router;
