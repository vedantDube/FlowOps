const prisma = require("../services/prisma");

/**
 * Feature #5: Notification Preferences Controller
 */

// ── Get notification preferences ──────────────────────────────────────────────
exports.getPreferences = async (req, res) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: req.userId },
    });

    // Auto-create defaults if none exist
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: req.userId },
      });
    }

    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update notification preferences ───────────────────────────────────────────
exports.updatePreferences = async (req, res) => {
  try {
    const { emailDigest, emailBilling, emailReview, emailWeekly } = req.body;

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.userId },
      update: {
        ...(emailDigest !== undefined && { emailDigest }),
        ...(emailBilling !== undefined && { emailBilling }),
        ...(emailReview !== undefined && { emailReview }),
        ...(emailWeekly !== undefined && { emailWeekly }),
      },
      create: {
        userId: req.userId,
        emailDigest: emailDigest ?? true,
        emailBilling: emailBilling ?? true,
        emailReview: emailReview ?? false,
        emailWeekly: emailWeekly ?? true,
      },
    });

    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
