/**
 * Feature #18: Real-Time Updates via WebSockets
 * Socket.IO service for live dashboard updates
 */

let io = null;

/**
 * Initialize Socket.IO with the HTTP server
 */
function initSocketIO(server) {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join org-specific room
    socket.on("join-org", (orgId) => {
      if (orgId) {
        socket.join(`org:${orgId}`);
        console.log(`📡 ${socket.id} joined org:${orgId}`);
      }
    });

    // Join repo-specific room
    socket.on("join-repo", (repoId) => {
      if (repoId) {
        socket.join(`repo:${repoId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get the Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Emit an event to all clients in an org room
 */
function emitToOrg(orgId, event, data) {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
}

/**
 * Emit an event to all clients in a repo room
 */
function emitToRepo(repoId, event, data) {
  if (io) {
    io.to(`repo:${repoId}`).emit(event, data);
  }
}

// Event types
const EVENTS = {
  NEW_COMMIT: "new-commit",
  NEW_PR: "new-pr",
  PR_UPDATED: "pr-updated",
  PR_REVIEW: "pr-review",
  AI_REVIEW_COMPLETE: "ai-review-complete",
  DOC_GENERATED: "doc-generated",
  SPRINT_HEALTH: "sprint-health-generated",
  INTEGRATION_UPDATE: "integration-update",
  USAGE_UPDATE: "usage-update",
};

module.exports = { initSocketIO, getIO, emitToOrg, emitToRepo, EVENTS };
