const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getPreferences,
  updatePreferences,
} = require("../controllers/notifications.controller");

router.get("/preferences", requireAuth, getPreferences);
router.put("/preferences", requireAuth, updatePreferences);

module.exports = router;
