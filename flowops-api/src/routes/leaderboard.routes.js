const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { requireOrgAccess } = require("../middleware/rbac.middleware");
const { getLeaderboard, getUserStats } = require("../controllers/leaderboard.controller");

router.get("/:orgId", requireAuth, requireOrgAccess, getLeaderboard);
router.get("/:orgId/:username", requireAuth, requireOrgAccess, getUserStats);

module.exports = router;
