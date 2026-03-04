const http = require("http");
const app = require("./App");
const { initSocketIO } = require("./services/socket.service");

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// ── Initialize WebSocket (Socket.IO) ────────────────────────────────────────
initSocketIO(server);

server.listen(PORT, () => {
  console.log(`🚀 FlowOps API running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});
