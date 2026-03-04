const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const {
  listChangelog,
  getChangelogEntry,
  createChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
  seedChangelog,
} = require("../controllers/changelog.controller");

// Public
router.get("/", listChangelog);
router.get("/:id", getChangelogEntry);

// Admin only
router.post("/", requireAuth, createChangelogEntry);
router.put("/:id", requireAuth, updateChangelogEntry);
router.delete("/:id", requireAuth, deleteChangelogEntry);
router.post("/seed", requireAuth, seedChangelog);

module.exports = router;
