/**
 * Demo org seeder — creates a "FlowOps Demo" organization filled with 60 days
 * of realistic engineering activity (commits, PRs, reviews, deployments,
 * incidents, AI reviews) so every dashboard lights up without connecting a
 * real repo or waiting for webhooks.
 *
 * Usage:
 *   node prisma/seed-demo.js                # attaches demo org to the first user
 *   node prisma/seed-demo.js <github-user>  # attaches to a specific username
 *
 * Log in via GitHub at least once before running, so a user exists.
 * Re-running wipes and regenerates the demo org (idempotent).
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEMO_SLUG = "flowops-demo";
const DAYS = 60;

// Deterministic RNG so re-seeding produces stable, comparable data
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260703);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));

const DEVS = [
  { name: "priya-sharma", weight: 3.0, nightOwl: false },
  { name: "marcus-chen", weight: 2.4, nightOwl: false },
  { name: "sofia-reyes", weight: 2.0, nightOwl: true }, // triggers the burnout radar
  { name: "tomasz-kowalski", weight: 1.6, nightOwl: false },
  { name: "aisha-bello", weight: 1.2, nightOwl: false },
  { name: "kenji-tanaka", weight: 0.8, nightOwl: false },
];

const REPOS = [
  { name: "checkout-service", fullName: "flowops-demo/checkout-service", desc: "Payments and order processing API" },
  { name: "web-storefront", fullName: "flowops-demo/web-storefront", desc: "Customer-facing Next.js storefront" },
  { name: "infra-tools", fullName: "flowops-demo/infra-tools", desc: "Deployment tooling and Terraform modules" },
];

const COMMIT_VERBS = ["Add", "Fix", "Refactor", "Update", "Remove", "Optimize", "Handle", "Improve"];
const COMMIT_SUBJECTS = [
  "checkout retry logic", "payment webhook validation", "cart state hydration", "order status polling",
  "product image lazy-loading", "search index sync", "rate limiter config", "session refresh flow",
  "flaky integration test", "N+1 in order history", "currency rounding edge case", "CSP headers",
  "Terraform state locking", "deploy rollback script", "healthcheck timeouts", "queue consumer backoff",
];
const PR_TITLES = [
  "Add idempotency keys to payment capture", "Fix double-submit on checkout button",
  "Migrate order history to cursor pagination", "Introduce feature flags for cart redesign",
  "Harden webhook signature verification", "Reduce storefront bundle size by 18%",
  "Add canary deploy stage to release pipeline", "Fix race condition in inventory reservation",
  "Refactor pricing engine for tax regions", "Add dead-letter queue for failed orders",
  "Upgrade Node 18 → 20 across services", "Instrument checkout funnel with tracing",
];

function pickDev() {
  const total = DEVS.reduce((s, d) => s + d.weight, 0);
  let r = rand() * total;
  for (const d of DEVS) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return DEVS[0];
}

// Realistic commit timestamp: mostly weekday working hours; night owls
// commit late, everyone occasionally spills into evenings/weekends.
// All in UTC — work-pattern analysis evaluates getUTCHours/getUTCDay, so
// generating in local time would shift everyone into "night owl" territory.
function commitTime(daysAgo, dev) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  const isWeekend = [0, 6].includes(date.getUTCDay());
  if (isWeekend && rand() > (dev.nightOwl ? 0.35 : 0.12)) return null; // most skip weekends
  let hour;
  if (dev.nightOwl && rand() < 0.45) hour = pick([21, 22, 23, 0, 1, 2]);
  else if (rand() < 0.12) hour = pick([6, 20, 21]); // occasional after-hours
  else hour = intBetween(9, 18);
  date.setUTCHours(hour, intBetween(0, 59), intBetween(0, 59), 0);
  return date;
}

async function main() {
  const usernameArg = process.argv[2];
  const user = usernameArg
    ? await prisma.user.findFirst({ where: { username: usernameArg } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.error("No user found. Log in to FlowOps via GitHub once, then re-run.");
    process.exit(1);
  }
  console.log(`Attaching demo org to user: ${user.username}`);

  // ── Wipe any previous demo org ────────────────────────────────────────────
  const existing = await prisma.organization.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    console.log("Removing previous demo org…");
    const repoIds = (
      await prisma.repository.findMany({ where: { organizationId: existing.id }, select: { id: true } })
    ).map((r) => r.id);
    // Cascades handle commits/PRs/reviews/deployments hanging off repos
    await prisma.incident.deleteMany({ where: { organizationId: existing.id } });
    await prisma.repository.deleteMany({ where: { id: { in: repoIds } } });
    await prisma.sprintHealth.deleteMany({ where: { organizationId: existing.id } });
    await prisma.notification.deleteMany({ where: { organizationId: existing.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: existing.id } });
    await prisma.usageRecord.deleteMany({ where: { organizationId: existing.id } });
    await prisma.dashboardLayout.deleteMany({ where: { organizationId: existing.id } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: existing.id } });
    await prisma.organization.delete({ where: { id: existing.id } });
  }

  // ── Org, membership, repos ────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: { name: "FlowOps Demo", slug: DEMO_SLUG, companyName: "Acme Storefront (Demo)" },
  });
  await prisma.organizationMember.create({
    data: { userId: user.id, organizationId: org.id, role: "owner" },
  });
  const repos = [];
  for (let i = 0; i < REPOS.length; i++) {
    repos.push(
      await prisma.repository.create({
        data: {
          name: REPOS[i].name,
          fullName: REPOS[i].fullName,
          githubRepoId: `demo-${DEMO_SLUG}-${i}`,
          description: REPOS[i].desc,
          organizationId: org.id,
        },
      }),
    );
  }

  // ── Commits ───────────────────────────────────────────────────────────────
  const commits = [];
  let shaCounter = 0;
  for (let day = DAYS; day >= 0; day--) {
    const dailyTarget = intBetween(4, 14);
    for (let c = 0; c < dailyTarget; c++) {
      const dev = pickDev();
      const at = commitTime(day, dev);
      if (!at) continue;
      const additions = intBetween(5, 320);
      commits.push({
        sha: `demo${String(++shaCounter).padStart(6, "0")}${Math.floor(rand() * 1e8).toString(16)}`,
        message: `${pick(COMMIT_VERBS)} ${pick(COMMIT_SUBJECTS)}`,
        author: dev.name,
        authorEmail: `${dev.name}@acme-demo.dev`,
        additions,
        deletions: intBetween(0, Math.floor(additions * 0.7)),
        filesChanged: intBetween(1, 12),
        committedAt: at,
        repositoryId: pick(repos).id,
      });
    }
  }
  await prisma.commit.createMany({ data: commits });
  console.log(`Created ${commits.length} commits`);

  // ── PRs with reviews (open → first review → approval → merge) ────────────
  let prNumber = 100;
  let mergedShas = []; // [{ repoId, sha, mergedAt }] for deployments' lead time
  const prPromises = [];
  for (let day = DAYS; day >= 1; day -= intBetween(1, 2)) {
    const prsToday = intBetween(1, 3);
    for (let i = 0; i < prsToday; i++) {
      const repo = pick(repos);
      const author = pickDev();
      const reviewer = pick(DEVS.filter((d) => d.name !== author.name));
      const openedAt = new Date();
      openedAt.setUTCDate(openedAt.getUTCDate() - day);
      openedAt.setUTCHours(intBetween(9, 17), intBetween(0, 59), 0, 0);

      const outcome = rand();
      const stillOpen = day <= 3 && rand() < 0.5;
      const firstReviewAt = new Date(openedAt.getTime() + between(2, 30) * 3_600_000);
      const approvedAt = new Date(firstReviewAt.getTime() + between(1, 18) * 3_600_000);
      const mergedAt = new Date(approvedAt.getTime() + between(0.5, 8) * 3_600_000);
      const merged = !stillOpen && outcome < 0.85;
      const closedUnmerged = !stillOpen && !merged;
      const mergeSha = merged ? `demo-merge-${prNumber}-${Math.floor(rand() * 1e6)}` : null;
      if (merged) mergedShas.push({ repoId: repo.id, sha: mergeSha, mergedAt });

      const additions = intBetween(20, 900);
      prPromises.push(
        prisma.pullRequest.create({
          data: {
            number: prNumber++,
            title: pick(PR_TITLES),
            body: "Part of the Q3 checkout reliability effort. See linked issue for context.",
            state: merged ? "merged" : stillOpen ? "open" : "closed",
            author: author.name,
            headBranch: `feature/demo-${prNumber}`,
            baseBranch: "main",
            additions,
            deletions: intBetween(5, Math.floor(additions * 0.6)),
            changedFiles: intBetween(1, 24),
            requestedReviewers: [reviewer.name],
            mergeCommitSha: mergeSha,
            openedAt,
            closedAt: merged ? mergedAt : closedUnmerged ? approvedAt : null,
            mergedAt: merged ? mergedAt : null,
            repositoryId: repo.id,
            reviews: stillOpen && rand() < 0.6
              ? undefined // some open PRs have no review yet — feeds "awaiting first review"
              : {
                  create: [
                    {
                      state: rand() < 0.3 ? "changes_requested" : "commented",
                      reviewer: reviewer.name,
                      body: "Left a few comments inline.",
                      reviewedAt: firstReviewAt,
                    },
                    ...(merged
                      ? [{
                          state: "approved",
                          reviewer: reviewer.name,
                          body: "LGTM after the fixes.",
                          reviewedAt: approvedAt,
                        }]
                      : []),
                  ],
                },
          },
        }),
      );
    }
  }
  const prs = await Promise.all(prPromises);
  console.log(`Created ${prs.length} pull requests`);

  // ── Deployments (most trace back to a merged PR for DORA lead time) ──────
  const deployments = [];
  let runId = 5000;
  for (const m of mergedShas) {
    if (rand() < 0.7) {
      deployments.push({
        environment: "production",
        status: rand() < 0.94 ? "success" : "failure",
        kind: "deployment",
        sha: m.sha,
        ref: "main",
        workflowRunId: `demo-run-${runId++}`,
        workflowName: "Deploy production",
        deployedAt: new Date(m.mergedAt.getTime() + between(0.3, 12) * 3_600_000),
        repositoryId: m.repoId,
      });
    }
  }
  await prisma.deployment.createMany({ data: deployments });
  console.log(`Created ${deployments.length} deployments`);

  // ── Incidents (some deploy-linked for change-failure rate) ────────────────
  const successfulDeploys = await prisma.deployment.findMany({
    where: { repository: { organizationId: org.id }, status: "success" },
    take: 5,
    orderBy: { deployedAt: "desc" },
  });
  const incidentTitles = [
    "Checkout latency spike after deploy", "Payment webhook retries exhausted",
    "Inventory oversell during flash sale", "Search results stale for 2h", "5xx burst on order API",
  ];
  for (let i = 0; i < Math.min(5, successfulDeploys.length); i++) {
    const d = successfulDeploys[i];
    const detectedAt = new Date(new Date(d.deployedAt).getTime() + between(0.2, 4) * 3_600_000);
    const resolved = i > 0; // leave the newest one open for the incidents page
    await prisma.incident.create({
      data: {
        title: incidentTitles[i],
        description: "Auto-generated demo incident.",
        severity: pick(["low", "medium", "medium", "high"]),
        status: resolved ? "resolved" : "investigating",
        detectedAt,
        resolvedAt: resolved ? new Date(detectedAt.getTime() + between(0.5, 20) * 3_600_000) : null,
        organizationId: org.id,
        repositoryId: d.repositoryId,
        deploymentId: i < 3 ? d.id : null, // only some count toward change-failure rate
      },
    });
  }
  console.log("Created 5 incidents");

  // ── A few completed AI reviews so that page isn't empty ──────────────────
  const reviewablePRs = await prisma.pullRequest.findMany({
    where: { repository: { organizationId: org.id }, state: "merged" },
    take: 4,
    orderBy: { mergedAt: "desc" },
  });
  for (const pr of reviewablePRs) {
    await prisma.aICodeReview.create({
      data: {
        status: "completed",
        summary:
          "Solid change overall. The retry logic is well-structured, but two payment-path branches lack test coverage and one query could use an index.",
        overallScore: intBetween(68, 93),
        securityIssues: [
          { severity: "medium", description: "Webhook payload parsed before signature verification in the error path." },
        ],
        performanceHints: [{ description: "orders.findMany in the summary endpoint would benefit from a composite index on (userId, createdAt)." }],
        antiPatterns: [{ pattern: "Swallowed exception", suggestion: "Log and rethrow in the payment capture catch block instead of returning null." }],
        refactorSuggestions: [{ description: "Extract the currency-rounding rules into a shared helper — they're duplicated in three files." }],
        repositoryId: pr.repositoryId,
        pullRequestId: pr.id,
      },
    });
  }
  console.log(`Created ${reviewablePRs.length} AI reviews`);

  // ── Sprint health snapshot for the Team page ──────────────────────────────
  await prisma.sprintHealth.create({
    data: {
      sprintName: "Sprint 24 — Checkout Reliability",
      healthScore: 78,
      deliveryPredictability: 84,
      burnoutRisk: "medium",
      prCycleAvgHours: 31.5,
      reviewLatencyAvgHours: 11.2,
      commitFrequency: 9.4,
      openPRs: 6,
      mergedPRs: 38,
      insights: [
        { type: "positive", title: "Cycle time trending down", description: "Average PR cycle time improved 14% versus the previous sprint." },
        { type: "warning", title: "Review load concentrated", description: "One reviewer handled 41% of all reviews — consider spreading the load." },
        { type: "warning", title: "Late-night activity detected", description: "One contributor shows a sustained late-night commit pattern." },
      ],
      organizationId: org.id,
    },
  });

  console.log(`\n✅ Demo org ready. Switch to "FlowOps Demo" in the org switcher as ${user.username}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
