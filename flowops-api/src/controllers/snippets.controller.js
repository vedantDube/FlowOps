const prisma = require("../services/prisma");

// ── List snippets
exports.listSnippets = async (req, res) => {
  try {
    const { search, language, favorite } = req.query;
    const where = { userId: req.userId };
    if (language) where.language = language;
    if (favorite === "true") where.isFavorite = true;

    let snippets = await prisma.codeSnippet.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    if (search) {
      const q = search.toLowerCase();
      snippets = snippets.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q)
      );
    }

    res.json(snippets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create snippet
exports.createSnippet = async (req, res) => {
  try {
    const { title, description, language, code, tags } = req.body;
    if (!title || !language || !code) {
      return res.status(400).json({ error: "title, language, and code are required" });
    }
    const snippet = await prisma.codeSnippet.create({
      data: { title, description, language, code, tags, userId: req.userId },
    });
    res.status(201).json(snippet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update snippet
exports.updateSnippet = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.codeSnippet.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Snippet not found" });

    const { title, description, language, code, tags, isFavorite } = req.body;
    const snippet = await prisma.codeSnippet.update({
      where: { id },
      data: { title, description, language, code, tags, isFavorite },
    });
    res.json(snippet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete snippet
exports.deleteSnippet = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.codeSnippet.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Snippet not found" });

    await prisma.codeSnippet.delete({ where: { id } });
    res.json({ message: "Snippet deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Toggle favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.codeSnippet.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Snippet not found" });

    const snippet = await prisma.codeSnippet.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
    });
    res.json(snippet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
