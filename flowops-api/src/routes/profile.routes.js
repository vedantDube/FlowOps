const express = require("express");
const router = express.Router();
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { updateProfileBody } = require("../utils/validators");
const { getProfile, updateProfile, getPublicProfile } = require("../controllers/profile.controller");

router.get("/me", requireAuth, getProfile);
router.put("/me", requireAuth, validate({ body: updateProfileBody }), updateProfile);
router.get("/:username", optionalAuth, getPublicProfile);

module.exports = router;
