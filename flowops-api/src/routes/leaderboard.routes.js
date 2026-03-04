const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { getLeaderboard, getUserStats } = require("../controllers/leaderboard.controller");

router.get("/:orgId", requireAuth, getLeaderboard);
router.get("/:orgId/:username", requireAuth, getUserStats);

module.exports = router;
