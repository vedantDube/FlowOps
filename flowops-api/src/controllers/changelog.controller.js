const prisma = require("../services/prisma");

/**
 * Feature #19: Changelog / What's New Controller
 */

// ── List changelog entries (public or authenticated) ──────────────────────────
exports.listChangelog = async (_req, res) => {
  try {
    const entries = await prisma.changelogEntry.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single entry ──────────────────────────────────────────────────────────
exports.getChangelogEntry = async (req, res) => {
  try {
    const entry = await prisma.changelogEntry.findUnique({
      where: { id: req.params.id },
    });
    if (!entry) return res.status(404).json({ error: "Not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create entry (admin only) ─────────────────────────────────────────────────
exports.createChangelogEntry = async (req, res) => {
  try {
    const { title, body, version, tags } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: "title and body are required" });
    }

    const entry = await prisma.changelogEntry.create({
      data: {
        title,
        body,
        version: version || null,
        tags: tags || [],
        published: true,
        publishedAt: new Date(),
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update entry ──────────────────────────────────────────────────────────────
exports.updateChangelogEntry = async (req, res) => {
  try {
    const { title, body, version, tags, published } = req.body;
    const entry = await prisma.changelogEntry.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(body !== undefined && { body }),
        ...(version !== undefined && { version }),
        ...(tags !== undefined && { tags }),
        ...(published !== undefined && { published }),
      },
    });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete entry ──────────────────────────────────────────────────────────────
exports.deleteChangelogEntry = async (req, res) => {
  try {
    await prisma.changelogEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Seed initial changelog data ───────────────────────────────────────────────
exports.seedChangelog = async (_req, res) => {
  try {
    const existing = await prisma.changelogEntry.count();
    if (existing > 0) {
      return res.json({ message: "Changelog already seeded" });
    }

    const entries = [
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
        title: "Stripe Billing & Plans",
        body: "Introducing Free, Pro ($29/mo), and Enterprise ($99/mo) plans with usage-based gating, Stripe checkout, and customer portal.",
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
        publishedAt: new Date(),
      },
    ];

    await prisma.changelogEntry.createMany({ data: entries });
    res.status(201).json({ message: `Seeded ${entries.length} changelog entries` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
