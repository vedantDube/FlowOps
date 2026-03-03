const axios = require("axios");

/**
 * Create a Jira API client for a given integration config
 */
function jiraClient({ baseUrl, email, apiToken }) {
  return axios.create({
    baseURL: `${baseUrl}/rest/api/3`,
    auth: { username: email, password: apiToken },
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
}

/**
 * Get all projects in the Jira workspace
 */
async function getProjects(config) {
  const client = jiraClient(config);
  const { data } = await client.get("/project/search?maxResults=50");
  return data.values || [];
}

/**
 * Get issues for a project (sprints / backlog)
 */
async function getIssues(config, projectKey, maxResults = 50) {
  const client = jiraClient(config);
  const jql = `project = "${projectKey}" ORDER BY updated DESC`;
  const { data } = await client.post("/search", {
    jql,
    maxResults,
    fields: [
      "summary",
      "status",
      "priority",
      "assignee",
      "created",
      "updated",
      "duedate",
      "storyPoints",
    ],
  });
  return data.issues || [];
}

/**
 * Get active sprints for a board
 */
async function getActiveSprints(config, boardId) {
  const client = jiraClient(config);
  // Use Agile API
  const agileClient = axios.create({
    baseURL: `${config.baseUrl}/rest/agile/1.0`,
    auth: { username: config.email, password: config.apiToken },
    headers: { Accept: "application/json" },
  });
  const { data } = await agileClient.get(
    `/board/${boardId}/sprint?state=active`,
  );
  return data.values || [];
}

module.exports = { getProjects, getIssues, getActiveSprints };
