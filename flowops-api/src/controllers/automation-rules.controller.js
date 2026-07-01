const prisma = require("../services/prisma");
const { logAudit } = require("../middleware/audit.middleware");
const { scanOrganization, getRulesForOrg, getAutomationImpact } = require("../services/automation.service");

/**
 * PR automation rules: stale PR nudges, unassigned-reviewer nudges,
 * and low-risk auto-approve. Orgs get sensible defaults until they
 * customize (see DEFAULT_RULES in automation.service.js).
 */

const TYPES = ["stale_pr", "unassigned_reviewer", "auto_approve"];

// ── List rules for an org (merged with defaults for any missing type) ────────
exports.listRules = async (req, res) => {
  try {
    const rules = await getRulesForOrg(req.params.orgId);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Upsert a rule (one row per type per org) ──────────────────────────────────
exports.upsertRule = async (req, res) => {
  try {
    const { type, enabled, thresholdHours, config } = req.body;
    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${TYPES.join(", ")}` });
    }

    const rule = await prisma.automationRule.upsert({
      where: { organizationId_type: { organizationId: req.params.orgId, type } },
      update: {
        ...(enabled !== undefined && { enabled }),
        ...(thresholdHours !== undefined && { thresholdHours }),
        ...(config !== undefined && { config }),
      },
      create: {
        organizationId: req.params.orgId,
        type,
        enabled: enabled !== false,
        thresholdHours: thresholdHours ?? 48,
        config: config || {},
      },
    });

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "automation_rule.updated",
      resourceType: "AutomationRule",
      resourceId: rule.id,
      metadata: { type, enabled: rule.enabled },
    });

    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Manually trigger a scan for this org (instant feedback, not just cron) ───
exports.triggerScan = async (req, res) => {
  try {
    const result = await scanOrganization(req.params.orgId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Automation impact summary (auto-merges, nudges, est. hours saved) ────────
exports.getImpact = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const impact = await getAutomationImpact(req.params.orgId, days);
    res.json(impact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
