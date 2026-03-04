const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { listAchievements, checkAchievements, seedAchievements } = require("../controllers/achievements.controller");

router.get("/", requireAuth, listAchievements);
router.post("/check", requireAuth, checkAchievements);
router.post("/seed", requireAuth, seedAchievements);

module.exports = router;
