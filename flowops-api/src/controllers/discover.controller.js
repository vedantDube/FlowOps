const { searchRepositories } = require("../services/github.service");
const { expandQuery, fetchDevToArticles } = require("../services/discover.service");
const logger = require("../utils/logger");

function mapRepo(r) {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    url: r.html_url,
    stars: r.stargazers_count,
    language: r.language,
    updatedAt: r.updated_at,
  };
}

// ── Discover: search GitHub repos + dev.to articles for a free-text topic
exports.search = async (req, res) => {
  try {
    const topic = req.body.topic.trim();
    const expansion = await expandQuery(topic);

    const [reposResult, articlesResult] = await Promise.allSettled([
      searchRepositories(req.user.accessToken, expansion.githubQuery, { sort: "stars", perPage: 10 }),
      fetchDevToArticles(expansion.tags, 10),
    ]);

    if (reposResult.status === "rejected" && articlesResult.status === "rejected") {
      logger.error({ err: reposResult.reason }, "Discover search: both sources failed");
      return res.status(502).json({ error: "Could not fetch results from GitHub or dev.to. Please try again." });
    }

    res.json({
      query: topic,
      expansion: { githubQuery: expansion.githubQuery, tags: expansion.tags, source: expansion.source },
      repos: reposResult.status === "fulfilled" ? reposResult.value.map(mapRepo) : [],
      articles: articlesResult.status === "fulfilled" ? articlesResult.value : [],
      warnings: {
        github: reposResult.status === "rejected" ? "GitHub search unavailable" : null,
        devto: articlesResult.status === "rejected" ? "dev.to unavailable" : null,
      },
    });
  } catch (err) {
    logger.error({ err }, "Discover search error");
    res.status(500).json({ error: "Search failed. Please try again." });
  }
};
