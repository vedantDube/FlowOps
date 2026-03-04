const prisma = require("../services/prisma");
const { generateDocumentation } = require("../services/gemini");
const {
  sendBlockMessage,
  buildDocsBlocks,
} = require("../services/slack.service");
const {
  getRepoTree,
  getRepoFilesContent,
  getUserRepos,
} = require("../services/github.service");
const { logAudit } = require("../middleware/audit.middleware");

// ── Generate documentation ─────────────────────────────────────────────────────
exports.generateDoc = async (req, res) => {
  const { type, context, title, organizationId, repositoryId } = req.body;

  if (!type || !context) {
    return res.status(400).json({ error: "type and context are required" });
  }

  try {
    const repo = repositoryId
      ? await prisma.repository.findUnique({ where: { id: repositoryId } })
      : null;

    const content = await generateDocumentation({
      type,
      context,
      repoName: repo?.fullName || title || "Unknown",
    });

    const doc = await prisma.documentation.create({
      data: {
        type,
        title:
          title || `${type.toUpperCase()} - ${new Date().toLocaleDateString()}`,
        content,
        status: "published",
        organizationId: organizationId || null,
        repositoryId: repositoryId || null,
      },
    });

    // Notify Slack if configured
    if (organizationId) {
      try {
        const slackIntegration = await prisma.integration.findUnique({
          where: { type_organizationId: { type: "slack", organizationId } },
        });
        if (slackIntegration?.status === "active") {
          const org = await prisma.organization.findUnique({
            where: { id: organizationId },
          });
          const blocks = buildDocsBlocks({
            orgName: org.name,
            docType: type,
            docTitle: doc.title,
            docUrl: `${process.env.FRONTEND_URL}/autodocs/${doc.id}`,
          });
          await sendBlockMessage(slackIntegration.config.webhookUrl, blocks);
        }
      } catch {
        /* non-fatal */
      }
    }

    await logAudit({
      userId: req.userId,
      organizationId,
      action: "docs.generated",
      resourceType: "Documentation",
      resourceId: doc.id,
      metadata: { type },
    });

    res.json(doc);
  } catch (err) {
    console.error("Docs generation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── List documentation for an org/repo ────────────────────────────────────────
exports.listDocs = async (req, res) => {
  try {
    const { orgId, repoId, type, limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only return docs when at least one repo is connected
    if (orgId) {
      const repoCount = await prisma.repository.count({
        where: { organizationId: orgId },
      });
      if (repoCount === 0) return res.json({ docs: [], total: 0 });
    }

    const where = {};
    if (orgId) where.organizationId = orgId;
    if (repoId) where.repositoryId = repoId;
    if (type) where.type = type;

    const [docs, total] = await Promise.all([
      prisma.documentation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: parseInt(limit),
        skip,
      }),
      prisma.documentation.count({ where }),
    ]);

    res.json({ docs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single doc ─────────────────────────────────────────────────────────────
exports.getDoc = async (req, res) => {
  try {
    const doc = await prisma.documentation.findUnique({
      where: { id: req.params.id },
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update doc ─────────────────────────────────────────────────────────────────
exports.updateDoc = async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const doc = await prisma.documentation.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(status && { status }),
        version: { increment: 1 },
      },
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete doc ─────────────────────────────────────────────────────────────────
exports.deleteDoc = async (req, res) => {
  try {
    await prisma.documentation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List user's GitHub repos ──────────────────────────────────────────────────
exports.listGithubRepos = async (req, res) => {
  try {
    const repos = await getUserRepos(req.user.accessToken);
    const simplified = repos.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      owner: r.owner.login,
      defaultBranch: r.default_branch,
      language: r.language,
      private: r.private,
    }));
    res.json(simplified);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Fetch repo file tree from GitHub ──────────────────────────────────────────
exports.fetchRepoTree = async (req, res) => {
  const { owner, repo, branch } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo are required" });
  }

  try {
    const tree = await getRepoTree(
      req.user.accessToken,
      owner,
      repo,
      branch || "main",
    );

    // Filter to only files (blobs), exclude large/binary extensions
    const EXCLUDED_EXT = new Set([
      ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp",
      ".mp4", ".mp3", ".wav", ".avi", ".mov",
      ".zip", ".tar", ".gz", ".rar", ".7z",
      ".woff", ".woff2", ".ttf", ".eot", ".otf",
      ".pdf", ".doc", ".docx", ".xls", ".xlsx",
      ".exe", ".dll", ".so", ".dylib",
      ".lock", ".min.js", ".min.css",
    ]);

    const files = (tree.tree || [])
      .filter((item) => {
        if (item.type !== "blob") return false;
        if (item.size > 100000) return false; // skip files > 100KB
        const ext = item.path.includes(".")
          ? "." + item.path.split(".").pop().toLowerCase()
          : "";
        if (EXCLUDED_EXT.has(ext)) return false;
        // skip common non-code directories
        if (
          item.path.startsWith("node_modules/") ||
          item.path.startsWith(".git/") ||
          item.path.startsWith("vendor/") ||
          item.path.startsWith("dist/") ||
          item.path.startsWith("build/")
        )
          return false;
        return true;
      })
      .map((item) => ({
        path: item.path,
        size: item.size,
      }));

    res.json({ files, totalFiles: files.length });
  } catch (err) {
    console.error("Repo tree fetch error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Fetch selected file contents from GitHub repo ─────────────────────────────
exports.fetchRepoContent = async (req, res) => {
  const { owner, repo, branch, filePaths } = req.body;
  if (!owner || !repo || !filePaths?.length) {
    return res
      .status(400)
      .json({ error: "owner, repo, and filePaths are required" });
  }

  // Limit to 50 files max to avoid overwhelming the AI
  const paths = filePaths.slice(0, 50);

  try {
    const files = await getRepoFilesContent(
      req.user.accessToken,
      owner,
      repo,
      paths,
      branch || "main",
    );

    // Concatenate into a single context string
    const context = files
      .map((f) => `── ${f.path} ──\n${f.content}`)
      .join("\n\n");

    // Trim to ~60K chars to stay within AI model limits
    res.json({ context: context.slice(0, 60000), fileCount: files.length });
  } catch (err) {
    console.error("Repo content fetch error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
