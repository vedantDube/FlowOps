const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getPersonalDashboard,
  getPersonalMetrics,
  getContributionHeatmap,
  setMode,
  getPersonalRepos,
} = require("../controllers/personal.controller");

router.get("/dashboard", requireAuth, getPersonalDashboard);
router.get("/metrics", requireAuth, getPersonalMetrics);
router.get("/heatmap", requireAuth, getContributionHeatmap);
router.get("/repos", requireAuth, getPersonalRepos);
router.put("/mode", requireAuth, setMode);

module.exports = router;
