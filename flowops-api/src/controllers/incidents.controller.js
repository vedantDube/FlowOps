const prisma = require("../services/prisma");
const { logAudit } = require("../middleware/audit.middleware");

/**
 * DORA metrics foundation: manual incident tracking. No PagerDuty/Opsgenie
 * integration exists to auto-ingest from, so incidents are reported by hand
 * and drive the change-failure-rate and MTTR calculations in
 * metrics.controller.js.
 */

// ── Create an incident ──────────────────────────────────────────────────────────
exports.createIncident = async (req, res) => {
  try {
    const { title, description, severity, repositoryId, deploymentId, detectedAt } = req.body;
    const orgId = req.params.orgId;

    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        severity,
        repositoryId,
        deploymentId,
        detectedAt: detectedAt ? new Date(detectedAt) : undefined,
        organizationId: orgId,
        reportedById: req.userId,
      },
    });

    await logAudit({
      userId: req.userId,
      organizationId: orgId,
      action: "incident.created",
      resourceType: "Incident",
      resourceId: incident.id,
      metadata: { title, severity },
    });

    res.status(201).json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List incidents for an org ───────────────────────────────────────────────────
exports.listIncidents = async (req, res) => {
  try {
    const { status, repositoryId } = req.query;
    const where = { organizationId: req.params.orgId };
    if (status) where.status = status;
    if (repositoryId) where.repositoryId = repositoryId;

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        repository: { select: { name: true, fullName: true } },
        reportedBy: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { detectedAt: "desc" },
    });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get a single incident ───────────────────────────────────────────────────────
exports.getIncident = async (req, res) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.incidentId },
      include: {
        repository: { select: { name: true, fullName: true } },
        deployment: true,
        reportedBy: { select: { username: true, avatarUrl: true } },
      },
    });
    if (!incident || incident.organizationId !== req.params.orgId) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update an incident (status/severity/resolvedAt) ─────────────────────────────
exports.updateIncident = async (req, res) => {
  try {
    const existing = await prisma.incident.findUnique({ where: { id: req.params.incidentId } });
    if (!existing || existing.organizationId !== req.params.orgId) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const { status, resolvedAt, severity, description } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (severity !== undefined) data.severity = severity;
    if (description !== undefined) data.description = description;
    if (resolvedAt !== undefined) data.resolvedAt = new Date(resolvedAt);
    // Resolving via status alone (no explicit resolvedAt) should still stamp
    // a resolution time — this is what actually drives MTTR.
    if (status === "resolved" && resolvedAt === undefined && !existing.resolvedAt) {
      data.resolvedAt = new Date();
    }

    const incident = await prisma.incident.update({
      where: { id: req.params.incidentId },
      data,
    });

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "incident.updated",
      resourceType: "Incident",
      resourceId: incident.id,
      metadata: { status: incident.status },
    });

    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete an incident ──────────────────────────────────────────────────────────
exports.deleteIncident = async (req, res) => {
  try {
    const existing = await prisma.incident.findUnique({ where: { id: req.params.incidentId } });
    if (!existing || existing.organizationId !== req.params.orgId) {
      return res.status(404).json({ error: "Incident not found" });
    }

    await prisma.incident.delete({ where: { id: req.params.incidentId } });

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "incident.deleted",
      resourceType: "Incident",
      resourceId: req.params.incidentId,
      metadata: { title: existing.title },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
