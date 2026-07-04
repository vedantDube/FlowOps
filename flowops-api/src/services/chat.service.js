const prisma = require("./prisma");
const { emitToUser, EVENTS } = require("./socket.service");

async function assertSameOrgMembership(organizationId, userAId, userBId) {
  const [a, b] = await Promise.all([
    prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: userAId, organizationId } },
    }),
    prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: userBId, organizationId } },
    }),
  ]);
  if (!a || !b) {
    throw Object.assign(new Error("Recipient is not a member of this organization"), { status: 403 });
  }
}

async function sendMessage({ organizationId, senderId, recipientId, body }) {
  if (senderId === recipientId) {
    throw Object.assign(new Error("Cannot message yourself"), { status: 400 });
  }
  await assertSameOrgMembership(organizationId, senderId, recipientId);

  const message = await prisma.chatMessage.create({
    data: { organizationId, senderId, recipientId, body },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
  });

  emitToUser(recipientId, EVENTS.CHAT_MESSAGE, message);
  emitToUser(senderId, EVENTS.CHAT_MESSAGE, message);

  return message;
}

async function getThread({ organizationId, userId, peerId, take = 50, before }) {
  await assertSameOrgMembership(organizationId, userId, peerId);

  const messages = await prisma.chatMessage.findMany({
    where: {
      organizationId,
      OR: [
        { senderId: userId, recipientId: peerId },
        { senderId: peerId, recipientId: userId },
      ],
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return messages.reverse();
}

async function markThreadRead({ organizationId, userId, peerId }) {
  await prisma.chatMessage.updateMany({
    where: { organizationId, senderId: peerId, recipientId: userId, read: false },
    data: { read: true },
  });
  emitToUser(peerId, EVENTS.CHAT_READ, { by: userId });
}

async function listConversations({ organizationId, userId }) {
  const messages = await prisma.chatMessage.findMany({
    where: {
      organizationId,
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      recipient: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  const byPeer = new Map();
  for (const m of messages) {
    const peer = m.senderId === userId ? m.recipient : m.sender;
    if (!byPeer.has(peer.id)) {
      byPeer.set(peer.id, { peer, lastMessage: m, unread: 0 });
    }
    if (m.recipientId === userId && !m.read) {
      byPeer.get(peer.id).unread += 1;
    }
  }

  return [...byPeer.values()].sort(
    (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt),
  );
}

module.exports = { assertSameOrgMembership, sendMessage, getThread, markThreadRead, listConversations };
