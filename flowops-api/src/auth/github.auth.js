const axios = require("axios");
const prisma = require("../services/prisma");
const { signToken } = require("../utils/jwt.utils");
const { logAudit } = require("../middleware/audit.middleware");
const { encrypt, decrypt } = require("../utils/encryption");
const logger = require("../utils/logger");

exports.githubCallback = async (req, res) => {
  const { code } = req.query;

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } },
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new Error("No access token received from GitHub");

    // 2. Get GitHub user profile
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const githubUser = userRes.data;

    // 3. Upsert user in database (encrypt token at rest)
    const encryptedToken = encrypt(accessToken);
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id.toString() },
      update: {
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken: encryptedToken,
      },
      create: {
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken: encryptedToken,
      },
    });

    // 4. Auto-provision personal org if user has none
    let org = await prisma.organization.findFirst({
      where: { members: { some: { userId: user.id } } },
    });

    if (!org) {
      const slug = `${githubUser.login.toLowerCase().replace(/[^a-z0-9]/g, "-")}-org`;
      org = await prisma.organization.create({
        data: {
          name: `${githubUser.login}'s Workspace`,
          slug,
          members: { create: { userId: user.id, role: "owner" } },
          subscription: { create: { plan: "free", status: "active" } },
        },
      });
    }

    // 5. Issue JWT
    const jwt = signToken({ userId: user.id, orgId: org.id });

    await logAudit({
      userId: user.id,
      organizationId: org.id,
      action: "auth.login",
      metadata: { provider: "github" },
    });

    // 6. Set JWT as httpOnly cookie and redirect (no token in URL)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("flowops_token", jwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });
    res.redirect(`${frontendUrl}/dashboard?orgId=${org.id}`);
  } catch (err) {
    logger.error({ err }, "GitHub Auth Error");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
};

exports.getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      memberships: {
        include: { organization: { include: { subscription: true } } },
      },
    },
  });
  res.json(user);
};
