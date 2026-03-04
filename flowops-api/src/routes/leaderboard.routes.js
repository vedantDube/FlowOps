const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { getLeaderboard, getUserStats } = require("../controllers/leaderboard.controller");

router.get("/:orgId", authenticate, getLeaderboard);
router.get("/:orgId/:username", authenticate, getUserStats);

module.exports = router;
