const prisma = require("./prisma");
const { generateEngineeringNarrative } = require("./gemini");

const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 3_600_000;
const avgOf = (arr) =>
  arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : 0;

/**
 * Gather the metrics bundle the "State of Engineering" narrative is written
 * from. Shared by the /ai/narrative endpoint and the weekly digest cron.
 */
async function buildNarrativeMetrics(organizationId, windowDays) {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  since.setHours(0, 0, 0, 0);
  const prevSince = new Date(since);
  prevSince.setDate(prevSince.getDate() - windowDays);

  const repoScope = { repository: { organizationId } };

  const [closedPRs, prevClosedPRs, openPRs, mergedCount, reviews, commits, deployments, incidents] =
    await Promise.all([
      prisma.pullRequest.findMany({
        where: { ...repoScope, closedAt: { gte: since } },
        select: { openedAt: true, closedAt: true, mergedAt: true, title: true, author: true },
      }),
      prisma.pullRequest.findMany({
        where: { ...repoScope, closedAt: { gte: prevSince, lt: since } },
        select: { openedAt: true, closedAt: true },
      }),
      prisma.pullRequest.count({ where: { ...repoScope, state: "open" } }),
      prisma.pullRequest.count({ where: { ...repoScope, mergedAt: { gte: since } } }),
      prisma.pullRequestReview.findMany({
        where: { pullRequest: repoScope, reviewedAt: { gte: since } },
        select: { reviewer: true, reviewedAt: true, pullRequest: { select: { openedAt: true } } },
      }),
      prisma.commit.findMany({
        where: { ...repoScope, committedAt: { gte: since } },
        select: { author: true, committedAt: true },
      }),
      prisma.deployment.count({
        where: { ...repoScope, kind: "deployment", status: "success", deployedAt: { gte: since } },
      }),
      prisma.incident.count({ where: { organizationId, detectedAt: { gte: since } } }),
    ]);

  const cycleTimes = closedPRs.map((pr) => hoursBetween(pr.openedAt, pr.closedAt));
  const prevCycleTimes = prevClosedPRs.map((pr) => hoursBetween(pr.openedAt, pr.closedAt));
  const reviewDelays = reviews.map((r) => hoursBetween(r.pullRequest.openedAt, r.reviewedAt));

  const countBy = (arr, key) => {
    const out = {};
    for (const item of arr) out[item[key]] = (out[item[key]] || 0) + 1;
    return Object.entries(out)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  };

  const afterHoursCommits = commits.filter((c) => {
    const h = new Date(c.committedAt).getUTCHours();
    return h < 8 || h >= 20;
  }).length;
  const weekendCommits = commits.filter((c) => {
    const d = new Date(c.committedAt).getUTCDay();
    return d === 0 || d === 6;
  }).length;

  return {
    prCycleTimeAvgHours: avgOf(cycleTimes),
    prCycleTimePrevPeriodAvgHours: avgOf(prevCycleTimes),
    reviewLatencyAvgHours: avgOf(reviewDelays),
    prsClosed: closedPRs.length,
    prsMerged: mergedCount,
    prsOpen: openPRs,
    totalCommits: commits.length,
    commitsByAuthor: countBy(commits, "author"),
    reviewsByReviewer: countBy(reviews, "reviewer"),
    successfulDeployments: deployments,
    incidentsDetected: incidents,
    afterHoursCommitPct: commits.length ? +((afterHoursCommits / commits.length) * 100).toFixed(1) : 0,
    weekendCommitPct: commits.length ? +((weekendCommits / commits.length) * 100).toFixed(1) : 0,
  };
}

/**
 * Generate the narrative for an org. Returns { narrative, metrics } or null
 * when there was no activity worth narrating (avoids Gemini calls and
 * "nothing happened" emails for dormant orgs).
 */
async function generateOrgNarrative(org, windowDays) {
  const metrics = await buildNarrativeMetrics(org.id, windowDays);
  if (!metrics.totalCommits && !metrics.prsClosed && !metrics.prsMerged) return null;

  const narrative = await generateEngineeringNarrative({
    orgName: org.name,
    windowDays,
    metrics,
  });
  return { narrative, metrics };
}

/**
 * Minimal Markdown → email-safe HTML for the narrative digest. Handles the
 * subset the narrative prompt produces: ##/### headings, **bold**, - lists,
 * and paragraphs. Escapes everything else.
 */
function narrativeMarkdownToHtml(md) {
  const escape = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const lines = md.split(/\r?\n/);
  const out = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      out.push(`<h3 style="color:#111;margin:20px 0 8px;font-size:15px;">${inline(heading[2])}</h3>`);
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) {
      if (!listOpen) {
        out.push('<ul style="margin:8px 0;padding-left:20px;color:#555;">');
        listOpen = true;
      }
      out.push(`<li style="margin:4px 0;">${inline(item[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p style="color:#555;margin:8px 0;line-height:1.6;">${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

module.exports = { buildNarrativeMetrics, generateOrgNarrative, narrativeMarkdownToHtml };
