const axios = require("axios");
const { expandDiscoveryQuery } = require("./gemini");
const logger = require("../utils/logger");

const STOPWORDS = new Set([
  "a", "an", "the", "for", "with", "and", "or", "to", "in", "of", "on",
  "how", "build", "building", "make", "making", "create", "creating",
  "app", "using", "want", "some", "that", "this", "into", "my", "i",
]);

/**
 * Local fallback query expansion used when Gemini is unavailable — tokenizes
 * the raw topic and keeps up to 4 non-stopword tokens as dev.to tags.
 */
function naiveExpand(topic) {
  const tags = topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .slice(0, 4);
  return { githubQuery: topic, tags: tags.length ? tags : [topic.toLowerCase().replace(/[^a-z0-9]/g, "")] };
}

/**
 * Expand a free-text topic into a GitHub search query + dev.to tags, using
 * Gemini when available and falling back to naive tokenization otherwise —
 * always resolves, never throws, so the caller doesn't need to branch on
 * whether AI expansion is configured.
 */
async function expandQuery(topic) {
  if (!process.env.GEMINI_API_KEY) {
    return { ...naiveExpand(topic), source: "fallback" };
  }
  try {
    const { githubQuery, tags } = await expandDiscoveryQuery(topic);
    return { githubQuery: githubQuery || topic, tags: (tags || []).slice(0, 4), source: "ai" };
  } catch (err) {
    logger.error({ err }, "Discovery query expansion failed, falling back to naive tokenization");
    return { ...naiveExpand(topic), source: "fallback" };
  }
}

/**
 * Fetch dev.to articles for a set of tags. dev.to's public API only filters
 * by a single tag per request, so fan out one request per tag and merge.
 */
async function fetchDevToArticles(tags, perPage = 10) {
  const perTag = Math.max(3, Math.ceil(perPage / Math.max(tags.length, 1)));
  const results = await Promise.allSettled(
    tags.map((tag) =>
      axios.get("https://dev.to/api/articles", { params: { tag, per_page: perTag } })
    )
  );

  const byId = new Map();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value.data) {
      if (byId.has(a.id)) continue;
      byId.set(a.id, {
        id: a.id,
        title: a.title,
        url: a.url,
        author: a.user?.name || "Unknown",
        publishedAt: a.published_at,
        reactions: a.public_reactions_count || 0,
        tags: a.tag_list || [],
        coverImage: a.cover_image || null,
      });
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.reactions - a.reactions)
    .slice(0, perPage);
}

module.exports = { naiveExpand, expandQuery, fetchDevToArticles };
