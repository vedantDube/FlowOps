require("dotenv").config();
const express = require("express");
const cors = require("cors");

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

// ── Routes ──────────────────────────────────────────────────────────────────
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

module.exports = app;
