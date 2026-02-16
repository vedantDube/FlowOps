const express = require("express");
const cors = require("cors");

const authRoutes = require("./auth/auth.routes");
const webhookRoutes = require("./routes/webhook.routes");
const metricsRoutes = require("./routes/metrics.routes");

const app = express();

app.use(
  "/webhooks",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(cors());
app.use(express.json());

app.use("/metrics", metricsRoutes);

app.use("/auth", authRoutes);
app.use("/webhooks", webhookRoutes);

module.exports = app;
