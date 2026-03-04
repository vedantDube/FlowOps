/**
 * Environment variable validation – runs at startup.
 * Fails fast if required variables are missing.
 */
const { z } = require("zod");
const logger = require("./logger");

const envSchema = z.object({
  // ── Required ──────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters")
    .refine(
      (s) => s !== "flowops-dev-secret-change-in-prod",
      "JWT_SECRET must not be the default dev secret in production",
    ),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),

  // ── Optional with defaults ────────────────────────────────────────────────
  PORT: z.string().optional().default("4000"),
  FRONTEND_URL: z.string().optional().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional().default("info"),
  JWT_EXPIRY: z.string().optional().default("7d"),

  // ── Optional services (warn if absent) ────────────────────────────────────
  GEMINI_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters").optional(),
});

function validateEnv() {
  // In development allow the default JWT_SECRET
  const schema =
    process.env.NODE_ENV === "production"
      ? envSchema
      : envSchema.extend({
          JWT_SECRET: z.string().optional().default("flowops-dev-secret-change-in-prod"),
          GITHUB_WEBHOOK_SECRET: z.string().optional().default("dev-webhook-secret"),
        });

  const result = schema.safeParse(process.env);

  if (!result.success) {
    logger.fatal({ errors: result.error.flatten().fieldErrors }, "❌  Invalid environment variables");
    process.exit(1);
  }

  // Warn about optional services that are missing
  const warnings = [];
  if (!process.env.GEMINI_API_KEY) warnings.push("GEMINI_API_KEY not set – AI features disabled");
  if (!process.env.RAZORPAY_KEY_ID) warnings.push("RAZORPAY_KEY_ID not set – billing disabled");
  if (!process.env.ENCRYPTION_KEY) warnings.push("ENCRYPTION_KEY not set – access tokens stored unencrypted");

  warnings.forEach((w) => logger.warn(w));

  return result.data;
}

module.exports = { validateEnv };
