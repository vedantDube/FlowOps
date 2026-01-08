const express = require("express");
const router = express.Router();
const { githubCallback } = require("./github.auth");

router.get("/github", (req, res) => {
  const redirectUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&scope=repo user`;

  res.redirect(redirectUrl);
});

router.get("/github/callback", githubCallback);

module.exports = router;
