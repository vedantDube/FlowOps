const express = require("express");
const router = express.Router();
const { githubCallback, getMe, logout } = require("./github.auth");
const { requireAuth } = require("../middleware/auth.middleware");

// Redirect to GitHub OAuth
router.get("/github", (_req, res) => {
  const redirectUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&scope=repo,user,read:org`;
  res.redirect(redirectUrl);
});

// GitHub OAuth callback
router.get("/github/callback", githubCallback);

// Get current authenticated user
router.get("/me", requireAuth, getMe);

// Clear the auth cookie
router.post("/logout", logout);

module.exports = router;
