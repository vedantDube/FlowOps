const axios = require("axios");
const prisma = require("../services/prisma");
const { signToken } = require("../utils/jwt.utils");
const { logAudit } = require("../middleware/audit.middleware");
const { encrypt, decrypt } = require("../utils/encryption");
const logger = require("../utils/logger");

// Frontend (Vercel) and API (Render) are on different domains, so the auth
// cookie must be SameSite=None to be sent on cross-site fetch/XHR calls —
// SameSite=Lax only survives top-level navigations, which would silently
// break every API call after login. SameSite=None requires Secure=true.
const isProd = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches default JWT_EXPIRY
};

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

    // The public profile's `email` field is only populated if the user has
    // made an email public on GitHub — most users haven't, so this is often
    // null even though the OAuth `user` scope already grants access to their
    // real (verified) email via /user/emails. Fall back to that instead of
    // silently storing no email, which would break every email feature for
    // that user with no indication anything's wrong.
    let email = githubUser.email;
    if (!email) {
      try {
        const emailsRes = await axios.get("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const primaryEmail =
          emailsRes.data.find((e) => e.primary && e.verified) ||
          emailsRes.data.find((e) => e.verified);
        email = primaryEmail?.email || null;
      } catch (emailErr) {
        logger.warn({ err: emailErr }, "Failed to fetch GitHub user emails");
      }
    }

    // 3. Upsert user in database (encrypt token at rest)
    const encryptedToken = encrypt(accessToken);
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id.toString() },
      update: {
        username: githubUser.login,
        // Only overwrite a previously-stored email if we resolved a real one
        // this time — a transient /user/emails failure shouldn't clobber a
        // known-good email with null on an existing user's re-login.
        ...(email && { email }),
        avatarUrl: githubUser.avatar_url,
        accessToken: encryptedToken,
      },
      create: {
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        email,
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

    // 6. Set the JWT as an httpOnly cookie and redirect without exposing it in the URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.cookie("flowops_token", jwt, COOKIE_OPTIONS);
    res.redirect(`${frontendUrl}/dashboard`);
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

exports.logout = async (req, res) => {
  res.clearCookie("flowops_token", { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" });
  res.status(204).end();
};
