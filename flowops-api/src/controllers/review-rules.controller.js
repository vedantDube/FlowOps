const prisma = require("../services/prisma");
const { logAudit } = require("../middleware/audit.middleware");

/**
 * Feature #7: Custom AI Review Rules CRUD
 */

// ── List rules for an org ─────────────────────────────────────────────────────
exports.listRules = async (req, res) => {
  try {
    const rules = await prisma.customReviewRule.findMany({
      where: { organizationId: req.params.orgId },
      orderBy: { createdAt: "desc" },
    });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create a new rule ─────────────────────────────────────────────────────────
exports.createRule = async (req, res) => {
  try {
    const { name, description, pattern, severity, enabled } = req.body;

    if (!name || !pattern) {
      return res.status(400).json({ error: "name and pattern are required" });
    }

    const rule = await prisma.customReviewRule.create({
      data: {
        organizationId: req.params.orgId,
        name,
        description: description || "",
        pattern,
        severity: severity || "warning",
        enabled: enabled !== false,
      },
    });

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "review_rule.created",
      resourceType: "CustomReviewRule",
      resourceId: rule.id,
      metadata: { name },
    });

    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update a rule ─────────────────────────────────────────────────────────────
exports.updateRule = async (req, res) => {
  try {
    const { name, description, pattern, severity, enabled } = req.body;

    const rule = await prisma.customReviewRule.update({
      where: { id: req.params.ruleId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(pattern !== undefined && { pattern }),
        ...(severity !== undefined && { severity }),
        ...(enabled !== undefined && { enabled }),
      },
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete a rule ─────────────────────────────────────────────────────────────
exports.deleteRule = async (req, res) => {
  try {
    await prisma.customReviewRule.delete({ where: { id: req.params.ruleId } });

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "review_rule.deleted",
      resourceType: "CustomReviewRule",
      resourceId: req.params.ruleId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get active rules for injection into AI prompt ────────────────────────────
exports.getActiveRules = async (orgId) => {
  const rules = await prisma.customReviewRule.findMany({
    where: { organizationId: orgId, enabled: true },
  });

  if (rules.length === 0) return "";

  return rules
    .map((r) => `[${r.severity.toUpperCase()}] ${r.name}: ${r.pattern}${r.description ? ` — ${r.description}` : ""}`)
    .join("\n");
};
