const express = require("express");
const cors = require("cors");
const authRoutes = require("./auth/auth.routes");

const webhookRoutes = require("./routes/webhook.routes");
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
app.use("/auth", authRoutes);
const healthRoutes = require("./routes/health.route");
app.use("/health", healthRoutes);

module.exports = app;
