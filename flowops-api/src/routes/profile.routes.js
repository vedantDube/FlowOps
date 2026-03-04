const express = require("express");
const router = express.Router();
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");
const { getProfile, updateProfile, getPublicProfile } = require("../controllers/profile.controller");

router.get("/me", requireAuth, getProfile);
router.put("/me", requireAuth, updateProfile);
router.get("/:username", optionalAuth, getPublicProfile);

module.exports = router;
