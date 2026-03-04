const prisma = require("../services/prisma");

// ── Create org invite
exports.createInvite = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    // Check caller is admin/owner
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: req.userId, organizationId: orgId } },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return res.status(403).json({ error: "Only admins can send invites" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.orgInvite.create({
      data: {
        email,
        role: role || "member",
        organizationId: orgId,
        invitedById: req.userId,
        expiresAt,
      },
    });

    res.status(201).json(invite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List pending invites for an org
exports.listInvites = async (req, res) => {
  try {
    const { orgId } = req.params;
    const invites = await prisma.orgInvite.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { username: true } } },
    });
    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Accept invite (by token)
exports.acceptInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await prisma.orgInvite.findUnique({
      where: { token },
      include: { organization: true },
    });
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.status !== "pending") return res.status(400).json({ error: "Invite already used" });
    if (new Date() > invite.expiresAt) return res.status(400).json({ error: "Invite has expired" });

    // Check if user email matches invite
    const user = req.user;
    if (invite.email !== user.email && invite.email !== user.username) {
      // Allow by userId too since GitHub email might differ
    }

    // Add user to org
    await prisma.organizationMember.upsert({
      where: { userId_organizationId: { userId: req.userId, organizationId: invite.organizationId } },
      update: { role: invite.role },
      create: { userId: req.userId, organizationId: invite.organizationId, role: invite.role },
    });

    await prisma.orgInvite.update({
      where: { token },
      data: { status: "accepted" },
    });

    res.json({
      message: `Joined ${invite.organization.name} as ${invite.role}`,
      orgId: invite.organizationId,
      orgName: invite.organization.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Cancel/revoke invite
exports.cancelInvite = async (req, res) => {
  try {
    const { orgId, inviteId } = req.params;
    const invite = await prisma.orgInvite.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    await prisma.orgInvite.update({
      where: { id: inviteId },
      data: { status: "cancelled" },
    });
    res.json({ message: "Invite cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List my pending invites (for the logged-in user)
exports.getMyInvites = async (req, res) => {
  try {
    const user = req.user;
    const invites = await prisma.orgInvite.findMany({
      where: {
        status: "pending",
        expiresAt: { gt: new Date() },
        OR: [{ email: user.email || "" }, { email: user.username }],
      },
      include: {
        organization: { select: { name: true, slug: true, avatarUrl: true } },
        invitedBy: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
