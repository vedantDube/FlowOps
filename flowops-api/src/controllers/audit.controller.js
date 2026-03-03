const prisma = require("../services/prisma");

// ── Get audit logs for an org ──────────────────────────────────────────────────
exports.listAuditLogs = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { limit = 50, page = 1, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { organizationId: orgId };
    if (action) where.action = { contains: action };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { username: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
