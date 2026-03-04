const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
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
router.post("/", authenticate, createChangelogEntry);
router.put("/:id", authenticate, updateChangelogEntry);
router.delete("/:id", authenticate, deleteChangelogEntry);
router.post("/seed", authenticate, seedChangelog);

module.exports = router;
