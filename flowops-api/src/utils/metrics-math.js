/**
 * Pure metric computations, extracted from the controllers so the math that
 * feeds every dashboard can be unit-tested without a database. Controllers
 * fetch rows via Prisma and hand plain objects to these functions.
 */

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] || 0;
}

const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 3_600_000;

const avgOf = (arr) =>
  arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2) : null;

/**
 * PR lifecycle stage timings.
 * @param {Array<{state: string, openedAt: Date|string, closedAt: Date|string|null,
 *   mergedAt: Date|string|null, reviews: Array<{state: string, reviewedAt: Date|string}>}>} prs
 *   Each PR's reviews must be sorted by reviewedAt ascending.
 * @returns {{ totals: object, stages: Array<{key, label, avgHours, count}> }}
 */
function computePRFlow(prs) {
  const toFirstReview = [];
  const reviewToApproval = [];
  const approvalToMerge = [];
  let reviewedCount = 0;
  let approvedCount = 0;
  let mergedCount = 0;
  let closedWithoutMerge = 0;
  let stillOpen = 0;

  for (const pr of prs) {
    const firstReview = pr.reviews[0] || null;
    const approval = pr.reviews.find((r) => r.state === "approved") || null;

    if (pr.mergedAt) mergedCount++;
    else if (pr.closedAt) closedWithoutMerge++;
    else stillOpen++;

    if (firstReview) {
      reviewedCount++;
      toFirstReview.push(hoursBetween(pr.openedAt, firstReview.reviewedAt));
    }
    if (approval) {
      approvedCount++;
      if (firstReview && approval.reviewedAt > firstReview.reviewedAt) {
        reviewToApproval.push(hoursBetween(firstReview.reviewedAt, approval.reviewedAt));
      }
      if (pr.mergedAt) {
        approvalToMerge.push(Math.max(0, hoursBetween(approval.reviewedAt, pr.mergedAt)));
      }
    }
  }

  return {
    totals: {
      opened: prs.length,
      reviewed: reviewedCount,
      approved: approvedCount,
      merged: mergedCount,
      closedWithoutMerge,
      open: stillOpen,
    },
    stages: [
      {
        key: "first_review",
        label: "Waiting for first review",
        avgHours: avgOf(toFirstReview),
        count: toFirstReview.length,
      },
      {
        key: "review_to_approval",
        label: "In review",
        avgHours: avgOf(reviewToApproval),
        count: reviewToApproval.length,
      },
      {
        key: "approval_to_merge",
        label: "Approved, waiting to merge",
        avgHours: avgOf(approvalToMerge),
        count: approvalToMerge.length,
      },
    ],
  };
}

/**
 * Burnout-signal work patterns from commit timestamps (evaluated in UTC).
 * @param {Array<{author: string, committedAt: Date|string}>} commits
 * @returns {{ totalCommits: number, org: object, authors: Array<object> }}
 */
function computeWorkPatterns(commits) {
  const byAuthor = {};
  for (const c of commits) {
    const d = new Date(c.committedAt);
    const hour = d.getUTCHours();
    const day = d.getUTCDay();
    const stats = (byAuthor[c.author] ||= {
      author: c.author,
      commits: 0,
      afterHours: 0, // before 8:00 or from 20:00 (UTC)
      lateNight: 0, // 00:00–05:59 (UTC)
      weekend: 0,
    });
    stats.commits++;
    if (hour < 8 || hour >= 20) stats.afterHours++;
    if (hour < 6) stats.lateNight++;
    if (day === 0 || day === 6) stats.weekend++;
  }

  const pct = (part, total) => (total ? +((part / total) * 100).toFixed(1) : 0);

  const authors = Object.values(byAuthor)
    .sort((a, b) => b.commits - a.commits)
    .map((a) => {
      const afterHoursPct = pct(a.afterHours, a.commits);
      const weekendPct = pct(a.weekend, a.commits);
      const lateNightPct = pct(a.lateNight, a.commits);
      // Heuristic risk score: late-night work weighs heaviest, then
      // after-hours, then weekends. Capped at 100.
      const score = Math.min(
        100,
        Math.round(lateNightPct * 1.2 + afterHoursPct * 0.6 + weekendPct * 0.5),
      );
      return {
        author: a.author,
        commits: a.commits,
        afterHoursPct,
        weekendPct,
        lateNightPct,
        riskScore: score,
        riskLevel: score >= 55 ? "high" : score >= 30 ? "medium" : "low",
      };
    });

  const totalCommits = commits.length;
  const orgAfterHours = authors.reduce((s, a) => s + (a.afterHoursPct * a.commits) / 100, 0);
  const orgWeekend = authors.reduce((s, a) => s + (a.weekendPct * a.commits) / 100, 0);
  const orgLateNight = authors.reduce((s, a) => s + (a.lateNightPct * a.commits) / 100, 0);
  // Load concentration: share of all commits made by the single busiest
  // author — a bus-factor / workload-balance signal.
  const topShare = totalCommits ? pct(authors[0]?.commits || 0, totalCommits) : 0;

  return {
    totalCommits,
    org: {
      afterHoursPct: pct(orgAfterHours, totalCommits),
      weekendPct: pct(orgWeekend, totalCommits),
      lateNightPct: pct(orgLateNight, totalCommits),
      loadConcentrationPct: topShare,
      contributors: authors.length,
    },
    authors,
  };
}

module.exports = { percentile, hoursBetween, avgOf, computePRFlow, computeWorkPatterns };
