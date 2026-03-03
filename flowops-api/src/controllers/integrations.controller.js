const prisma = require("../services/prisma");
const jira = require("../services/jira.service");
const { logAudit } = require("../middleware/audit.middleware");

// ── Upsert an integration config ───────────────────────────────────────────────
exports.saveIntegration = async (req, res) => {
  const { orgId } = req.params;
  const { type, config } = req.body;

  if (!["jira", "slack", "github"].includes(type)) {
    return res.status(400).json({ error: "Unsupported integration type" });
  }

  try {
    const integration = await prisma.integration.upsert({
      where: { type_organizationId: { type, organizationId: orgId } },
      update: { config, status: "active", updatedAt: new Date() },
      create: { type, config, organizationId: orgId, status: "active" },
    });

    await logAudit({
      userId: req.userId,
      organizationId: orgId,
      action: `integration.${type}.saved`,
      resourceType: "Integration",
      resourceId: integration.id,
    });

    res.json(integration);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get all integrations for org ───────────────────────────────────────────────
exports.listIntegrations = async (req, res) => {
  try {
    const integrations = await prisma.integration.findMany({
      where: { organizationId: req.params.orgId },
      select: { id: true, type: true, status: true, updatedAt: true }, // Never expose config/tokens
    });
    res.json(integrations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete an integration ──────────────────────────────────────────────────────
exports.deleteIntegration = async (req, res) => {
  const { orgId, type } = req.params;
  try {
    await prisma.integration.delete({
      where: { type_organizationId: { type, organizationId: orgId } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Jira: list projects ────────────────────────────────────────────────────────
exports.getJiraProjects = async (req, res) => {
  try {
    const integration = await prisma.integration.findUnique({
      where: {
        type_organizationId: { type: "jira", organizationId: req.params.orgId },
      },
    });
    if (!integration)
      return res.status(404).json({ error: "Jira not connected" });

    const projects = await jira.getProjects(integration.config);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Jira: list issues for project ─────────────────────────────────────────────
exports.getJiraIssues = async (req, res) => {
  try {
    const integration = await prisma.integration.findUnique({
      where: {
        type_organizationId: { type: "jira", organizationId: req.params.orgId },
      },
    });
    if (!integration)
      return res.status(404).json({ error: "Jira not connected" });

    const issues = await jira.getIssues(
      integration.config,
      req.params.projectKey,
    );
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
