const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createSnippetBody, updateSnippetBody } = require("../utils/validators");
const { listSnippets, createSnippet, updateSnippet, deleteSnippet, toggleFavorite } = require("../controllers/snippets.controller");

router.get("/", requireAuth, listSnippets);
router.post("/", requireAuth, validate({ body: createSnippetBody }), createSnippet);
router.put("/:id", requireAuth, validate({ body: updateSnippetBody }), updateSnippet);
router.delete("/:id", requireAuth, deleteSnippet);
router.post("/:id/favorite", requireAuth, toggleFavorite);

module.exports = router;
