const prisma = require("../services/prisma");

/**
 * Custom Dashboard Builder — layout persistence.
 * A layout with userId: null is an org-wide "team dashboard" (mirrors the
 * Notification.userId null-means-org-wide pattern elsewhere in this schema).
 * Only admins/owners may create or modify a shared (userId: null) layout;
 * personal layouts are always writable by their owner regardless of role.
 */

// ── List layouts visible to the caller (own + org-wide shared) ─────────────
exports.listDashboardLayouts = async (req, res) => {
  try {
    const orgId = req.query.orgId;

    const layouts = await prisma.dashboardLayout.findMany({
      where: {
        organizationId: orgId,
        OR: [{ userId: req.userId }, { userId: null }],
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(layouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create a new named layout ───────────────────────────────────────────────
exports.createDashboardLayout = async (req, res) => {
  try {
    const { organizationId, name, widgets, shared } = req.body;

    if (shared) {
      const level = { owner: 4, admin: 3, member: 2, viewer: 1 };
      const role = req.membership?.role;
      if (!role || level[role] < level.admin) {
        return res.status(403).json({ error: "Only admins can create a shared team dashboard" });
      }
    }

    const layout = await prisma.dashboardLayout.create({
      data: {
        organizationId,
        name,
        widgets,
        userId: shared ? null : req.userId,
      },
    });

    res.status(201).json(layout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update a layout (name/widgets/isDefault) ────────────────────────────────
exports.updateDashboardLayout = async (req, res) => {
  try {
    const existing = await prisma.dashboardLayout.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "Layout not found" });
    }

    if (existing.userId === null) {
      const level = { owner: 4, admin: 3, member: 2, viewer: 1 };
      const role = req.membership?.role;
      if (!role || level[role] < level.admin) {
        return res.status(403).json({ error: "Only admins can edit the shared team dashboard" });
      }
    } else if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "You can only edit your own layouts" });
    }

    const { name, widgets, isDefault } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (widgets !== undefined) data.widgets = widgets;
    if (isDefault !== undefined) data.isDefault = isDefault;

    if (isDefault === true && existing.userId !== null) {
      await prisma.dashboardLayout.updateMany({
        where: { organizationId: existing.organizationId, userId: req.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const layout = await prisma.dashboardLayout.update({
      where: { id: req.params.id },
      data,
    });

    res.json(layout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete a layout ──────────────────────────────────────────────────────────
exports.deleteDashboardLayout = async (req, res) => {
  try {
    const existing = await prisma.dashboardLayout.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "Layout not found" });
    }

    if (existing.userId === null) {
      const level = { owner: 4, admin: 3, member: 2, viewer: 1 };
      const role = req.membership?.role;
      if (!role || level[role] < level.admin) {
        return res.status(403).json({ error: "Only admins can delete the shared team dashboard" });
      }
    } else if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "You can only delete your own layouts" });
    }

    await prisma.dashboardLayout.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Set a layout as this user's default ─────────────────────────────────────
exports.setDefaultDashboardLayout = async (req, res) => {
  try {
    const existing = await prisma.dashboardLayout.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "Layout not found" });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "You can only set your own layout as default" });
    }

    await prisma.dashboardLayout.updateMany({
      where: { organizationId: existing.organizationId, userId: req.userId, isDefault: true },
      data: { isDefault: false },
    });

    const layout = await prisma.dashboardLayout.update({
      where: { id: req.params.id },
      data: { isDefault: true },
    });

    res.json(layout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
