/**
 * Input validation schemas using Zod.
 * Reusable across controllers and routes.
 */
const { z } = require("zod");

// ── Common ──────────────────────────────────────────────────────────────────

const uuidParam = z.string().uuid();

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const metricsQuery = z.object({
  orgId: z.string().uuid().optional(),
  repoId: z.string().uuid().optional(),
  days: z.coerce.number().int().min(0).max(365).optional().default(7),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const metricsWithLimitQuery = metricsQuery.extend({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

// ── Org ─────────────────────────────────────────────────────────────────────

const createOrgBody = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

const updateOrgBody = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  customDomain: z.string().optional(),
  customLogo: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  companyName: z.string().max(200).optional(),
  dataRetentionDays: z.number().int().min(30).max(730).optional(),
});

// ── Tasks ───────────────────────────────────────────────────────────────────

const createTaskBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["todo", "in-progress", "done"]).optional().default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  repoLink: z.string().url().optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskBody = createTaskBody.partial();

// ── Snippets ────────────────────────────────────────────────────────────────

const createSnippetBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  language: z.string().min(1).max(50),
  code: z.string().min(1).max(50_000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isFavorite: z.boolean().optional().default(false),
});

const updateSnippetBody = createSnippetBody.partial();

// ── API Keys ────────────────────────────────────────────────────────────────

const createApiKeyBody = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// ── Invites ─────────────────────────────────────────────────────────────────

const createInviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).optional().default("member"),
});

// ── Review Rules ────────────────────────────────────────────────────────────

const createReviewRuleBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  rule: z.string().min(1).max(2000),
  severity: z.enum(["info", "warning", "error"]).optional().default("warning"),
  enabled: z.boolean().optional().default(true),
});

const updateReviewRuleBody = createReviewRuleBody.partial();

// ── Billing ─────────────────────────────────────────────────────────────────

const createSubscriptionBody = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
});

// ── Profile ─────────────────────────────────────────────────────────────────

const updateProfileBody = z.object({
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal("")),
  twitter: z.string().max(50).optional(),
  linkedin: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  skills: z.array(z.string().max(50)).max(30).optional(),
  isPublic: z.boolean().optional(),
});

// ── Onboarding ──────────────────────────────────────────────────────────────

const onboardingBody = z.object({
  preferredMode: z.enum(["personal", "org"]).optional(),
  orgName: z.string().min(1).max(100).optional(),
  orgSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

module.exports = {
  uuidParam,
  paginationQuery,
  metricsQuery,
  metricsWithLimitQuery,
  createOrgBody,
  updateOrgBody,
  createTaskBody,
  updateTaskBody,
  createSnippetBody,
  updateSnippetBody,
  createApiKeyBody,
  createInviteBody,
  createReviewRuleBody,
  updateReviewRuleBody,
  createSubscriptionBody,
  updateProfileBody,
  onboardingBody,
};
