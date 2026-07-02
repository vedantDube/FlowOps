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

// ── Export audit logs as CSV ─────────────────────────────────────────────────
// No pagination — a compliance/security export is expected to be complete.
// Capped at 10,000 rows so a single request can't run unbounded on a huge org.
exports.exportAuditLogsCsv = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { action } = req.query;

    const where = { organizationId: orgId };
    if (action) where.action = { contains: action };

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 10_000,
    });

    const escape = (val) => {
      const s = val == null ? "" : String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = ["Timestamp", "Action", "User", "Resource Type", "Resource ID", "IP Address"];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.action,
      log.user?.username || "System",
      log.resourceType || "",
      log.resourceId || "",
      log.ipAddress || "",
    ]);

    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-log-${orgId}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
