const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middleware/error.middleware");
const logger = require("./utils/logger");

// ── Existing routes ─────────────────────────────────────────────────────────
const authRoutes = require("./auth/auth.routes");
const webhookRoutes = require("./routes/webhook.routes");
const metricsRoutes = require("./routes/metrics.routes");
const aiRoutes = require("./routes/ai.routes");
const docsRoutes = require("./routes/docs.routes");
const orgRoutes = require("./routes/org.routes");
const integrationsRoutes = require("./routes/integrations.routes");
const billingRoutes = require("./routes/billing.routes");
const auditRoutes = require("./routes/audit.routes");
const healthRoutes = require("./routes/health.route");

// ── New SaaS routes ─────────────────────────────────────────────────────────
const usageRoutes = require("./routes/usage.routes");
const onboardingRoutes = require("./routes/onboarding.routes");
const apiKeysRoutes = require("./routes/api-keys.routes");
const reportRoutes = require("./routes/report.routes");
const complianceRoutes = require("./routes/compliance.routes");
const changelogRoutes = require("./routes/changelog.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes");
const reviewRulesRoutes = require("./routes/review-rules.routes");
const slackCommandsRoutes = require("./routes/slack-commands.routes");

// ── Individual Developer routes ─────────────────────────────────────────────
const personalRoutes = require("./routes/personal.routes");
const profileRoutes = require("./routes/profile.routes");
const achievementsRoutes = require("./routes/achievements.routes");
const snippetsRoutes = require("./routes/snippets.routes");
const tasksRoutes = require("./routes/tasks.routes");
const invitesRoutes = require("./routes/invites.routes");

// ── Middleware ───────────────────────────────────────────────────────────────
const { apiLimiter, authLimiter, webhookLimiter } = require("./middleware/rate-limit.middleware");
const { authenticateApiKey } = require("./middleware/api-key.middleware");

const app = express();

// Raw body for webhook signature verification & Stripe webhooks
app.use(
  "/webhooks",
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

// ── Global rate limiting ────────────────────────────────────────────────────
app.use("/api", apiLimiter);
app.use("/auth", authLimiter);
app.use("/webhooks", webhookLimiter);

// ── API key auth (alternative to JWT, checked on /api/* routes) ─────────────
app.use("/api", authenticateApiKey);

// ── Existing Routes ─────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/metrics", metricsRoutes);
app.use("/ai", aiRoutes);
app.use("/docs", docsRoutes);
app.use("/orgs", orgRoutes);
app.use("/integrations", integrationsRoutes);
app.use("/billing", billingRoutes);
app.use("/audit", auditRoutes);
app.use("/health", healthRoutes);

// ── New SaaS Routes ─────────────────────────────────────────────────────────
app.use("/usage", usageRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/api-keys", apiKeysRoutes);
app.use("/report", reportRoutes);
app.use("/compliance", complianceRoutes);
app.use("/changelog", changelogRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/review-rules", reviewRulesRoutes);
app.use("/slack", slackCommandsRoutes);

// ── Individual Developer Routes ─────────────────────────────────────────────
app.use("/personal", personalRoutes);
app.use("/profile", profileRoutes);
app.use("/achievements", achievementsRoutes);
app.use("/snippets", snippetsRoutes);
app.use("/tasks", tasksRoutes);
app.use("/invites", invitesRoutes);

// ── Global Error Handler (must be LAST) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
