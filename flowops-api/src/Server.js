require("dotenv").config();

const logger = require("./utils/logger");
const { validateEnv } = require("./utils/env");

// ── Validate environment before anything else ───────────────────────────────
validateEnv();

const http = require("http");
const cron = require("node-cron");
const app = require("./App");
const { initSocketIO } = require("./services/socket.service");
const { runAutomationScan, getAutomationImpact } = require("./services/automation.service");
const { sendAutomationImpactEmail } = require("./services/email.service");
const { generateOrgNarrative, narrativeMarkdownToHtml } = require("./services/narrative.service");

const prisma = require("./services/prisma");

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// ── Initialize WebSocket (Socket.IO) ────────────────────────────────────────
initSocketIO(server);

// ── Seed changelog if empty ─────────────────────────────────────────────────
async function seedChangelog() {
  try {
    const count = await prisma.changelogEntry.count();
    if (count > 0) return;

    await prisma.changelogEntry.createMany({
      data: [
        {
          title: "FlowOps Launch 🚀",
          body: "We're live! FlowOps connects to your GitHub repos, tracks commits, PRs, and generates AI-powered code reviews and documentation.",
          version: "1.0.0",
          tags: ["launch", "feature"],
          published: true,
          publishedAt: new Date("2025-01-15"),
        },
        {
          title: "AI Code Reviews",
          body: "Get instant AI-powered code reviews on your pull requests. Our Gemini-powered review engine analyzes code quality, security, and best practices.",
          version: "1.1.0",
          tags: ["feature", "ai"],
          published: true,
          publishedAt: new Date("2025-02-01"),
        },
        {
          title: "Auto-generated Documentation",
          body: "Automatically generate comprehensive documentation for your repositories using AI analysis of your codebase.",
          version: "1.2.0",
          tags: ["feature", "ai"],
          published: true,
          publishedAt: new Date("2025-03-01"),
        },
        {
          title: "Razorpay Billing & Plans",
          body: "Introducing Free, Pro (₹2,400/mo), and Enterprise (₹8,300/mo) plans with usage-based gating, Razorpay checkout, and customer portal.",
          version: "1.3.0",
          tags: ["feature", "billing"],
          published: true,
          publishedAt: new Date("2025-04-01"),
        },
        {
          title: "20 SaaS Features Drop",
          body: "Massive update: usage metering, RBAC, onboarding wizard, API keys, public status page, compliance tools, keyboard shortcuts, real-time updates, and more!",
          version: "2.0.0",
          tags: ["feature", "major"],
          published: true,
          publishedAt: new Date("2025-05-01"),
        },
      ],
    });
    logger.info("📋 Changelog seeded with initial entries");
  } catch (err) {
    logger.warn({ err }, "Changelog seed skipped (non-critical)");
  }
}

// ── Graceful shutdown ───────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

// ── PR automation: stale/unassigned-reviewer nudges + low-risk auto-approve ──
cron.schedule("*/15 * * * *", () => {
  runAutomationScan().catch((err) => logger.error({ err }, "Automation scan failed"));
});

// ── Weekly automation impact digest (Mondays 09:00 server time) ──────────────
async function sendWeeklyImpactDigests() {
  const orgs = await prisma.organization.findMany({
    where: { repos: { some: {} } },
    include: {
      members: { include: { user: { include: { notificationPref: true } } } },
    },
  });

  for (const org of orgs) {
    try {
      const impact = await getAutomationImpact(org.id, 7);

      // AI narrative section — generated once per org, shared by every
      // recipient. Optional: skipped when Gemini isn't configured or the
      // generation fails, so the digest still goes out without it.
      let narrativeHtml = null;
      if (process.env.GEMINI_API_KEY) {
        try {
          const result = await generateOrgNarrative(org, 7);
          if (result) narrativeHtml = narrativeMarkdownToHtml(result.narrative);
        } catch (err) {
          logger.warn({ err, organizationId: org.id }, "Digest narrative generation failed; sending without it");
        }
      }

      for (const member of org.members) {
        const user = member.user;
        if (!user?.email) continue;
        if (user.notificationPref && user.notificationPref.emailWeekly === false) continue;
        await sendAutomationImpactEmail(user, org.name, impact, narrativeHtml);
      }
    } catch (err) {
      logger.error({ err, organizationId: org.id }, "Weekly impact digest failed for org");
    }
  }
}

cron.schedule("0 9 * * 1", () => {
  sendWeeklyImpactDigests().catch((err) => logger.error({ err }, "Weekly impact digest run failed"));
});

server.listen(PORT, () => {
  logger.info(`🚀 FlowOps API running on port ${PORT}`);
  logger.info(`🔌 WebSocket server ready`);
  logger.info(`⚡ PR automation scanning every 15 minutes`);
  seedChangelog();
});
