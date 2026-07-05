const axios = require("axios");

function githubClient(accessToken) {
  return axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
}

/**
 * Get authenticated user's basic profile
 */
async function getAuthenticatedUser(accessToken) {
  const client = githubClient(accessToken);
  const { data } = await client.get("/user");
  return data;
}

/**
 * Get all repos accessible to the user (including org repos)
 */
async function getUserRepos(accessToken) {
  const client = githubClient(accessToken);
  const { data } = await client.get("/user/repos?per_page=100&sort=updated");
  return data;
}

/**
 * Get PR diff content
 */
async function getPullRequestDiff(accessToken, owner, repo, prNumber) {
  const client = githubClient(accessToken);
  client.defaults.headers.Accept = "application/vnd.github.v3.diff";
  const { data } = await client.get(
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
  );
  return data;
}

/**
 * Get PR files changed
 */
async function getPullRequestFiles(accessToken, owner, repo, prNumber) {
  const client = githubClient(accessToken);
  const { data } = await client.get(
    `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
  );
  return data;
}

/**
 * Get recent commits for a repo
 */
async function getRepoCommits(accessToken, owner, repo, since) {
  const client = githubClient(accessToken);
  const params = since ? `?since=${since}&per_page=100` : "?per_page=100";
  const { data } = await client.get(`/repos/${owner}/${repo}/commits${params}`);
  return data;
}

/**
 * Register a webhook on a GitHub repo
 */
async function registerWebhook(accessToken, owner, repo, webhookUrl) {
  const client = githubClient(accessToken);
  const { data } = await client.post(`/repos/${owner}/${repo}/hooks`, {
    name: "web",
    active: true,
    events: ["push", "pull_request", "pull_request_review"],
    config: {
      url: webhookUrl,
      content_type: "json",
      secret: process.env.GITHUB_WEBHOOK_SECRET,
    },
  });
  return data;
}

/**
 * Delete a webhook from a GitHub repo
 */
async function deleteWebhook(accessToken, owner, repo, hookId) {
  const client = githubClient(accessToken);
  await client.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
}

/**
 * Fetch recent commits from a repo (for initial sync)
 */
async function getRecentCommits(
  accessToken,
  owner,
  repo,
  perPage = 30,
  page = 1,
  { since, until } = {},
) {
  const client = githubClient(accessToken);
  const params = new URLSearchParams({ per_page: perPage, page });
  if (since) params.set("since", since);
  if (until) params.set("until", until);
  const { data } = await client.get(
    `/repos/${owner}/${repo}/commits?${params.toString()}`,
  );
  return data;
}

/**
 * Fetch all commits in a repo within an optional date window, following
 * pagination until GitHub returns a short page. Use for full-history or
 * custom date-range queries where a single 100-commit page would truncate.
 */
async function getAllCommitsInRange(accessToken, owner, repo, { since, until } = {}) {
  const perPage = 100;
  let page = 1;
  let all = [];
  while (true) {
    const batch = await getRecentCommits(accessToken, owner, repo, perPage, page, { since, until });
    all = all.concat(batch);
    if (batch.length < perPage) break;
    page++;
    if (page > 20) break; // safety cap: 2000 commits per repo
  }
  return all;
}

/**
 * Fetch pull requests from a repo (for initial sync)
 */
async function getRepoPullRequests(
  accessToken,
  owner,
  repo,
  state = "all",
  perPage = 30,
  page = 1,
) {
  const client = githubClient(accessToken);
  const { data } = await client.get(
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}&page=${page}`,
  );
  return data;
}

/**
 * Get the full file tree of a repo (recursive)
 */
async function getRepoTree(accessToken, owner, repo, branch = "main") {
  const client = githubClient(accessToken);
  // First get the branch ref to find the tree SHA
  const { data: branchData } = await client.get(
    `/repos/${owner}/${repo}/branches/${branch}`,
  );
  const treeSha = branchData.commit.commit.tree.sha;
  const { data } = await client.get(
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
  );
  return data;
}

/**
 * Get the content of a single file from a repo
 */
async function getFileContent(accessToken, owner, repo, path, ref) {
  const client = githubClient(accessToken);
  const params = ref ? `?ref=${ref}` : "";
  const { data } = await client.get(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${params}`,
  );
  // GitHub returns base64 encoded content
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content || "";
}

/**
 * Approve a pull request review (used by low-risk auto-approve automation)
 */
async function approvePullRequest(accessToken, owner, repo, prNumber, body) {
  const client = githubClient(accessToken);
  const { data } = await client.post(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    { event: "APPROVE", body: body || "Auto-approved by FlowOps (low-risk change)." },
  );
  return data;
}

/**
 * Merge a pull request (used by low-risk auto-approve automation)
 */
async function mergePullRequest(accessToken, owner, repo, prNumber) {
  const client = githubClient(accessToken);
  const { data } = await client.put(
    `/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    { merge_method: "squash" },
  );
  return data;
}

/**
 * Get contributors for a repo
 */
async function getRepoContributors(accessToken, owner, repo) {
  const client = githubClient(accessToken);
  const { data } = await client.get(
    `/repos/${owner}/${repo}/contributors?per_page=100`,
  );
  return data;
}

/**
 * Get a GitHub user's profile (includes public email)
 */
async function getUserProfile(accessToken, username) {
  const client = githubClient(accessToken);
  const { data } = await client.get(`/users/${username}`);
  return data;
}

/**
 * Search public repositories by keyword (GitHub search API)
 */
async function searchRepositories(accessToken, query, { sort = "stars", perPage = 10 } = {}) {
  const client = githubClient(accessToken);
  const { data } = await client.get("/search/repositories", {
    params: { q: query, sort, order: "desc", per_page: perPage },
  });
  return data.items;
}

/**
 * Get contents of multiple files from a repo, concatenated
 */
async function getRepoFilesContent(
  accessToken,
  owner,
  repo,
  filePaths,
  branch,
) {
  const results = [];
  for (const fp of filePaths) {
    try {
      const content = await getFileContent(
        accessToken,
        owner,
        repo,
        fp,
        branch,
      );
      results.push({ path: fp, content });
    } catch {
      // skip files that can't be read (binary, too large, etc.)
      results.push({ path: fp, content: "[Could not read file]" });
    }
  }
  return results;
}

module.exports = {
  getAuthenticatedUser,
  getUserRepos,
  getPullRequestDiff,
  getPullRequestFiles,
  getRepoCommits,
  registerWebhook,
  deleteWebhook,
  getRecentCommits,
  getAllCommitsInRange,
  getRepoPullRequests,
  getRepoTree,
  getFileContent,
  getRepoFilesContent,
  getRepoContributors,
  getUserProfile,
  approvePullRequest,
  mergePullRequest,
  searchRepositories,
};
