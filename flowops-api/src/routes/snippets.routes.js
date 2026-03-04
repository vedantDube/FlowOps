const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { listSnippets, createSnippet, updateSnippet, deleteSnippet, toggleFavorite } = require("../controllers/snippets.controller");

router.get("/", requireAuth, listSnippets);
router.post("/", requireAuth, createSnippet);
router.put("/:id", requireAuth, updateSnippet);
router.delete("/:id", requireAuth, deleteSnippet);
router.post("/:id/favorite", requireAuth, toggleFavorite);

module.exports = router;
