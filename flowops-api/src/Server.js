require("dotenv").config();

const logger = require("./utils/logger");
const { validateEnv } = require("./utils/env");

// ── Validate environment before anything else ───────────────────────────────
validateEnv();

const http = require("http");
const app = require("./App");
const { initSocketIO } = require("./services/socket.service");

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// ── Initialize WebSocket (Socket.IO) ────────────────────────────────────────
initSocketIO(server);

// ── Graceful shutdown ───────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

server.listen(PORT, () => {
  logger.info(`🚀 FlowOps API running on port ${PORT}`);
  logger.info(`🔌 WebSocket server ready`);
});
