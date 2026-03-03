const express = require("express");
const router = express.Router();
const {
  generateDoc,
  listDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  listGithubRepos,
  fetchRepoTree,
  fetchRepoContent,
} = require("../controllers/docs.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/github/repos", listGithubRepos);
router.get("/github/tree", fetchRepoTree);
router.post("/github/content", fetchRepoContent);
router.post("/generate", generateDoc);
router.get("/", listDocs);
router.get("/:id", getDoc);
router.put("/:id", updateDoc);
router.delete("/:id", deleteDoc);

module.exports = router;
