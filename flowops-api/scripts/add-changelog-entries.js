/**
 * One-off script to add real changelog entries for work shipped since the
 * initial seed (see seedChangelog in changelog.controller.js, which only
 * runs once and stopped being the source of truth long ago).
 *
 * Usage: DATABASE_URL=<production-url> node scripts/add-changelog-entries.js
 * Safe to re-run — upserts by `version`, so it won't create duplicates.
 */

const prisma = require("../src/services/prisma");

const ENTRIES = [
  {
    version: "2.1.0",
    title: "AI Help Assistant",
    body: "A Gemini-powered help widget lives in the corner of every page — it knows what page you're on, suggests relevant questions, renders answers with real markdown formatting, and offers proactive tips if you're stuck.",
    tags: ["feature", "ai"],
    publishedAt: new Date("2025-06-15"),
  },
  {
    version: "2.2.0",
    title: "Custom Cursor & Motion Polish",
    body: "A glowing comet-style cursor trail follows you across the whole app, and the AI assistant mascot now tracks your cursor with animated eyes. Both respect reduced-motion and touch-device preferences automatically.",
    tags: ["polish", "ui"],
    publishedAt: new Date("2025-06-20"),
  },
  {
    version: "2.3.0",
    title: "7 Accent Color Themes",
    body: "Pick your accent color from the theme switcher — Green, Blue, Indigo, Violet, Rose, Amber, or Teal. Applies instantly across the whole app and persists across sessions.",
    tags: ["feature", "ui"],
    publishedAt: new Date("2025-06-25"),
  },
  {
    version: "2.4.0",
    title: "Premium Frontend Polish",
    body: "Smoother page transitions, shimmering loading skeletons, consistent focus states and hover feedback throughout, and friendlier empty states with clear calls to action on Dashboard, AI Review, Team Insights, and AutoDocs.",
    tags: ["polish", "ui"],
    publishedAt: new Date("2025-07-01"),
  },
  {
    version: "2.5.0",
    title: "Smarter Email Notifications",
    body: "New users now get a real welcome email. AI code review results can optionally be emailed to you as they complete. The weekly digest now combines automation impact (hours saved, auto-merged PRs) with your team's engineering metrics in a single email instead of two.",
    tags: ["feature", "notifications"],
    publishedAt: new Date("2025-07-02"),
  },
];

async function main() {
  for (const entry of ENTRIES) {
    // `version` isn't a unique column in the schema, so upsert() isn't
    // available — look up by version manually instead.
    const existing = await prisma.changelogEntry.findFirst({
      where: { version: entry.version },
    });

    const result = existing
      ? await prisma.changelogEntry.update({
          where: { id: existing.id },
          data: {
            title: entry.title,
            body: entry.body,
            tags: entry.tags,
            publishedAt: entry.publishedAt,
            published: true,
          },
        })
      : await prisma.changelogEntry.create({
          data: { ...entry, published: true },
        });

    console.log(`✓ ${result.version} — ${result.title}`);
  }
  console.log(`\nDone. ${ENTRIES.length} entries upserted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
