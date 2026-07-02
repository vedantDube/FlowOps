const prisma = require("./prisma");
const { createNotification } = require("./notification.service");
const { approvePullRequest, mergePullRequest } = require("./github.service");
const { logAudit } = require("../middleware/audit.middleware");
const logger = require("../utils/logger");

/**
 * PR automation engine: nudges for stale/unassigned PRs, and optional
 * low-risk auto-approve+merge. Runs on a cron schedule (see Server.js)
 * and can also be triggered on-demand from Settings > Automation.
 */

const DEFAULT_RULES = {
  stale_pr: { enabled: true, thresholdHours: 48, config: {} },
  unassigned_reviewer: { enabled: true, thresholdHours: 24, config: {} },
  // Auto-approve is opt-in: merging code without a human is high-blast-radius,
  // so it stays off until an org explicitly enables it in Settings.
  auto_approve: {
    enabled: false,
    thresholdHours: 0,
    config: { maxChangedFiles: 3, maxDiffLines: 40, docsOnly: true },
  },
};

/**
 * Returns the effective rule set for an org: stored rows override defaults,
 * any type without a stored row falls back to DEFAULT_RULES so nudges work
 * out of the box with zero configuration.
 */
async function getRulesForOrg(organizationId) {
  const stored = await prisma.automationRule.findMany({ where: { organizationId } });
  const byType = Object.fromEntries(stored.map((r) => [r.type, r]));

  return Object.entries(DEFAULT_RULES).map(([type, defaults]) => {
    const row = byType[type];
    return row
      ? row
      : { id: null, organizationId, type, ...defaults };
  });
}

function hoursSince(date) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

function isLowRiskPR(pr, config) {
  const maxChangedFiles = config?.maxChangedFiles ?? 3;
  const maxDiffLines = config?.maxDiffLines ?? 40;
  const diffLines = (pr.additions || 0) + (pr.deletions || 0);
  if (pr.changedFiles > maxChangedFiles || diffLines > maxDiffLines) return false;

  if (config?.docsOnly) {
    // Cheap heuristic from title/branch — a real implementation would check
    // the actual changed file paths via the GitHub API before approving.
    const text = `${pr.title} ${pr.headBranch || ""}`.toLowerCase();
    return /docs?|readme|\.md\b|typo|comment/.test(text);
  }
  return true;
}

async function alreadyNotified(organizationId, type, prId) {
  const existing = await prisma.notification.findFirst({
    where: { organizationId, type, link: { contains: prId } },
  });
  return !!existing;
}

/**
 * Scan a single organization's open PRs against its automation rules.
 * Returns a summary so the "Run scan now" button can show instant feedback.
 */
async function scanOrganization(organizationId) {
  const rules = await getRulesForOrg(organizationId);
  const byType = Object.fromEntries(rules.map((r) => [r.type, r]));
  const summary = { stalePr: 0, unassignedReviewer: 0, autoApproved: 0, errors: 0 };

  const openPRs = await prisma.pullRequest.findMany({
    where: { state: "open", repository: { organizationId } },
    include: { repository: true, reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } },
  });

  for (const pr of openPRs) {
    try {
      const lastActivity = pr.reviews[0]?.reviewedAt || pr.openedAt;
      const prPath = `/team?repo=${pr.repositoryId}&pr=${pr.number}`;

      // ── Stale PR nudge ──────────────────────────────────────────────────
      const staleRule = byType.stale_pr;
      if (staleRule.enabled && hoursSince(lastActivity) > staleRule.thresholdHours) {
        if (!(await alreadyNotified(organizationId, "stale_pr", pr.id))) {
          await createNotification({
            organizationId,
            type: "stale_pr",
            title: `PR #${pr.number} has been idle for ${Math.floor(hoursSince(lastActivity) / 24)}+ days`,
            body: `"${pr.title}" in ${pr.repository.name} hasn't had activity since ${new Date(lastActivity).toLocaleDateString()}.`,
            link: `${prPath}&pid=${pr.id}`,
            metadata: { prNumber: pr.number, prAuthor: pr.author, repoId: pr.repositoryId, repoName: pr.repository.name },
            email: true,
            slack: true,
          });
          summary.stalePr++;
        }
      }

      // ── Unassigned reviewer nudge ───────────────────────────────────────
      const reviewerRule = byType.unassigned_reviewer;
      const hasReviewers = Array.isArray(pr.requestedReviewers) && pr.requestedReviewers.length > 0;
      const hasReview = pr.reviews.length > 0;
      if (
        reviewerRule.enabled &&
        !hasReviewers &&
        !hasReview &&
        hoursSince(pr.openedAt) > reviewerRule.thresholdHours
      ) {
        if (!(await alreadyNotified(organizationId, "unassigned_reviewer", pr.id))) {
          await createNotification({
            organizationId,
            type: "unassigned_reviewer",
            title: `PR #${pr.number} has no reviewer assigned`,
            body: `"${pr.title}" in ${pr.repository.name} was opened by ${pr.author} ${Math.floor(hoursSince(pr.openedAt))}h ago with no reviewer.`,
            link: `${prPath}&pid=${pr.id}`,
            metadata: { prNumber: pr.number, prAuthor: pr.author, repoId: pr.repositoryId, repoName: pr.repository.name },
            email: true,
            slack: true,
          });
          summary.unassignedReviewer++;
        }
      }

      // ── Low-risk auto-approve ───────────────────────────────────────────
      const autoRule = byType.auto_approve;
      if (autoRule.enabled && !hasReview && isLowRiskPR(pr, autoRule.config)) {
        const member = await prisma.organizationMember.findFirst({
          where: { organizationId },
          include: { user: true },
        });
        if (member?.user?.accessToken) {
          const [owner, repoName] = pr.repository.fullName.split("/");
          await approvePullRequest(member.user.accessToken, owner, repoName, pr.number);
          await mergePullRequest(member.user.accessToken, owner, repoName, pr.number);

          await logAudit({
            organizationId,
            action: "automation.auto_approved_merged",
            resourceType: "PullRequest",
            resourceId: pr.id,
            metadata: { number: pr.number, title: pr.title },
          });

          await createNotification({
            organizationId,
            type: "auto_approved",
            title: `PR #${pr.number} auto-approved & merged`,
            body: `"${pr.title}" matched low-risk criteria and was merged automatically.`,
            link: `${prPath}&pid=${pr.id}`,
            metadata: { prNumber: pr.number, prAuthor: pr.author, repoId: pr.repositoryId, repoName: pr.repository.name },
            slack: true,
          });
          summary.autoApproved++;
        }
      }
    } catch (err) {
      summary.errors++;
      logger.warn({ err, prId: pr.id }, "Automation scan failed for PR");
    }
  }

  return summary;
}

/**
 * Scan all organizations that have at least one connected repo.
 * Called from the cron schedule in Server.js.
 */
async function runAutomationScan() {
  const orgs = await prisma.organization.findMany({
    where: { repos: { some: {} } },
    select: { id: true },
  });

  for (const org of orgs) {
    try {
      await scanOrganization(org.id);
    } catch (err) {
      logger.error({ err, organizationId: org.id }, "Automation scan failed for org");
    }
  }
}

// Rough estimate of human time a low-risk auto-approve+merge replaces
// (skim the diff, approve, merge) — used to translate a count into a
// number a manager actually cares about.
const HOURS_SAVED_PER_AUTO_APPROVE = 0.25;

/**
 * Aggregate automation activity for an org over the trailing `days` window.
 * Powers both the Settings > Automation impact card and the weekly digest email.
 */
async function getAutomationImpact(organizationId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    autoApprovedCount,
    stalePrNudges,
    unassignedReviewerNudges,
    commits,
    prsMerged,
    mergedForCycleTime,
    aiReviews,
  ] = await Promise.all([
    prisma.auditLog.count({
      where: { organizationId, action: "automation.auto_approved_merged", createdAt: { gte: since } },
    }),
    prisma.notification.count({
      where: { organizationId, type: "stale_pr", createdAt: { gte: since } },
    }),
    prisma.notification.count({
      where: { organizationId, type: "unassigned_reviewer", createdAt: { gte: since } },
    }),
    prisma.commit.count({
      where: { repository: { organizationId }, committedAt: { gte: since } },
    }),
    prisma.pullRequest.count({
      where: { repository: { organizationId }, mergedAt: { gte: since } },
    }),
    prisma.pullRequest.findMany({
      where: { repository: { organizationId }, mergedAt: { gte: since } },
      select: { openedAt: true, closedAt: true },
    }),
    prisma.aICodeReview.findMany({
      where: { repository: { organizationId }, status: "completed", createdAt: { gte: since } },
      select: { securityIssues: true },
    }),
  ]);

  const cycleTimes = mergedForCycleTime
    .filter((pr) => pr.closedAt)
    .map((pr) => (new Date(pr.closedAt) - new Date(pr.openedAt)) / 3_600_000);
  const avgCycleTime = cycleTimes.length
    ? +(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(1)
    : null;

  const securityIssues = aiReviews.reduce(
    (sum, r) => sum + (Array.isArray(r.securityIssues) ? r.securityIssues.length : 0),
    0,
  );

  return {
    days,
    autoApprovedCount,
    stalePrNudges,
    unassignedReviewerNudges,
    estimatedHoursSaved: +(autoApprovedCount * HOURS_SAVED_PER_AUTO_APPROVE).toFixed(1),
    commits,
    prsMerged,
    avgCycleTime,
    aiReviews: aiReviews.length,
    securityIssues,
  };
}

module.exports = { getRulesForOrg, scanOrganization, runAutomationScan, getAutomationImpact };
