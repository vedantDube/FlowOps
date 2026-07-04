/**
 * Feature #18: Real-Time Updates via WebSockets
 * Socket.IO service for live dashboard updates
 */

let io = null;

/**
 * Pull the flowops_token value out of a raw Cookie header string, without
 * pulling in the `cookie` package for a single-key lookup.
 */
function extractTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("flowops_token="));
  return match ? decodeURIComponent(match.slice("flowops_token=".length)) : null;
}

/**
 * Initialize Socket.IO with the HTTP server
 */
function initSocketIO(server) {
  const { Server } = require("socket.io");
  const logger = require("../utils/logger");
  const { verifyToken } = require("../utils/jwt.utils");
  const prisma = require("./prisma");

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Reject the connection outright unless it carries a valid session — every
  // room join below trusts socket.userId, which only exists once this passes.
  io.use((socket, next) => {
    const token = extractTokenFromCookieHeader(socket.handshake.headers.cookie);
    if (!token) return next(new Error("unauthorized"));
    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id, userId: socket.userId }, "Client connected");

    // Join org-specific room — only if the authenticated user is actually a
    // member of that org, otherwise this room would leak org-wide events
    // (including chat-adjacent notifications) to anyone who guesses an orgId.
    socket.on("join-org", async (orgId) => {
      if (!orgId) return;
      const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: socket.userId, organizationId: orgId } },
      });
      if (!membership) {
        logger.warn({ socketId: socket.id, userId: socket.userId, orgId }, "Rejected join-org: not a member");
        return;
      }
      socket.join(`org:${orgId}`);
      logger.debug({ socketId: socket.id, orgId }, "Joined org room");
    });

    // Join repo-specific room
    socket.on("join-repo", (repoId) => {
      if (repoId) {
        socket.join(`repo:${repoId}`);
      }
    });

    // Join user-specific room (personal notifications, chat) — only for your
    // own id, otherwise anyone could read another user's private messages.
    socket.on("join-user", (userId) => {
      if (!userId) return;
      if (userId !== socket.userId) {
        logger.warn({ socketId: socket.id, requested: userId, actual: socket.userId }, "Rejected join-user: identity mismatch");
        return;
      }
      socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "Client disconnected");
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

/**
 * Emit an event to a specific user's room (personal notifications)
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
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
  NOTIFICATION: "notification",
  DEPLOYMENT_STATUS: "deployment-status",
  WORKFLOW_RUN: "workflow-run",
  CHAT_MESSAGE: "chat-message",
  CHAT_READ: "chat-read",
};

module.exports = { initSocketIO, getIO, emitToOrg, emitToRepo, emitToUser, EVENTS };
