const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getPreferences,
  updatePreferences,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notifications.controller");

router.get("/preferences", requireAuth, getPreferences);
router.put("/preferences", requireAuth, updatePreferences);

router.get("/", requireAuth, listNotifications);
router.put("/:id/read", requireAuth, markNotificationRead);
router.put("/read-all", requireAuth, markAllNotificationsRead);

module.exports = router;
