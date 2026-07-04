const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Get a Gemini Pro text model instance
 */
function getModel() {
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

/**
 * Generate a structured AI code review for a pull request diff
 */
async function reviewPullRequest({ title, body, diff, repoName, customRules }) {
  const model = getModel();

  const customRulesBlock = customRules
    ? `\n\nAdditionally, enforce these custom review rules:\n${customRules}\n`
    : "";

  const prompt = `You are an expert software engineer performing a code review.

Repository: ${repoName}
PR Title: ${title}
PR Description: ${body || "No description provided."}
${customRulesBlock}
Code Diff:
\`\`\`
${diff?.slice(0, 12000) || "No diff available."}
\`\`\`

Provide a thorough code review as a JSON object with the following structure:
{
  "summary": "2-3 sentence overall summary",
  "overallScore": <0-100 integer>,
  "securityIssues": [{ "severity": "critical|high|medium|low", "description": "..." }],
  "performanceHints": [{ "description": "..." }],
  "antiPatterns": [{ "pattern": "pattern name", "suggestion": "..." }],
  "refactorSuggestions": [{ "description": "...", "code": "optional code snippet" }]
}

Return ONLY valid JSON, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Gemini returned invalid JSON: " + text.slice(0, 200));
  }
}

/**
 * Generate living documentation (README, API docs, architecture overview)
 */
async function generateDocumentation({ type, context, repoName }) {
  const model = getModel();

  const typePrompts = {
    readme: `Generate a comprehensive, well-structured README.md for the repository "${repoName}". Include: Overview, Features, Tech Stack, Getting Started, API Overview, Contributing, License.`,
    api: `Generate detailed API documentation in Markdown for the following code/routes context. Include endpoints, request/response examples, authentication notes.`,
    architecture: `Generate an architecture overview document explaining the system design, components, data flow, and technology choices based on the context.`,
    "knowledge-base": `Generate a team knowledge base article based on the following context. Make it clear, structured, and useful for onboarding.`,
  };

  const prompt = `${typePrompts[type] || typePrompts.readme}

IMPORTANT: Your documentation must be strictly and exclusively based on the provided context below. Do NOT invent, assume, or add any features, endpoints, functions, or details that are not explicitly present in the context. Only document what is actually in the code/content provided. If the context contains specific files, only describe what those files contain.

Context:
\`\`\`
${context?.slice(0, 10000) || "No context provided."}
\`\`\`

Return clean, well-formatted Markdown only. Stay strictly within the scope of the provided context.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate sprint health insights from metrics
 */
async function generateSprintInsights(metrics) {
  const model = getModel();

  const prompt = `You are an engineering team coach analyzing sprint health data.

Sprint Metrics:
- PR Cycle Time (avg): ${metrics.prCycleAvgHours} hours
- Review Latency (avg): ${metrics.reviewLatencyAvgHours} hours
- Commit Frequency: ${metrics.commitFrequency} commits/day
- Open PRs: ${metrics.openPRs}
- Merged PRs: ${metrics.mergedPRs}

Return a JSON array of 3-5 actionable insights, each with:
{ "type": "positive|warning|critical", "title": "...", "description": "..." }

Return ONLY valid JSON array.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  }
}

/**
 * Review raw code (not from a PR diff)
 */
async function reviewCode({ code, fileName, repoName, customRules }) {
  const model = getModel();

  const customRulesBlock = customRules
    ? `\n\nAdditionally, enforce these custom review rules:\n${customRules}\n`
    : "";

  const prompt = `You are an expert software engineer performing a thorough code review.

Repository: ${repoName || "Unknown"}
File: ${fileName || "Unknown"}
${customRulesBlock}
Code:
\`\`\`
${code?.slice(0, 15000) || "No code provided."}
\`\`\`

Perform a comprehensive code review analyzing security, performance, patterns, and code quality.

Provide your review as a JSON object with the following structure:
{
  "summary": "2-3 sentence overall summary of code quality",
  "overallScore": <0-100 integer>,
  "securityIssues": [{ "severity": "critical|high|medium|low", "description": "..." }],
  "performanceHints": [{ "description": "..." }],
  "antiPatterns": [{ "pattern": "pattern name", "suggestion": "..." }],
  "refactorSuggestions": [{ "description": "...", "code": "optional code snippet" }]
}

Return ONLY valid JSON, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Gemini returned invalid JSON: " + text.slice(0, 200));
  }
}

const ASSISTANT_SYSTEM_CONTEXT = `You are the FlowOps AI Assistant, a helpful in-app guide for FlowOps —
an engineering intelligence SaaS platform that provides: AI-powered pull request code review,
AutoDocs (AI-generated documentation), team/sprint analytics (PR cycle time, review latency,
commit activity, code churn), GitHub/Slack/Jira integrations, an audit log, and usage-based
billing plans (Free, Pro, Enterprise).

Answer questions about how to use FlowOps, what features do, and general software engineering
best-practice suggestions. Be concise (2-4 short paragraphs max, use bullet points where helpful).

You do NOT have access to this specific user's data, organization, repositories, or account
details — do not guess or invent specifics about their account. If asked something that requires
their actual data (e.g. "what's my PR cycle time"), tell them to check the relevant dashboard page
instead of making up numbers.`;

/**
 * Answer a free-form user question about FlowOps or general engineering topics.
 * Stateless — no conversation history is sent, each question is independent.
 */
async function askAssistant({ question, pageContext }) {
  const model = getModel();
  const contextLine = pageContext
    ? `\n\nThe user is currently on the "${pageContext.slice(0, 100)}" page of FlowOps.`
    : "";
  const prompt = `${ASSISTANT_SYSTEM_CONTEXT}${contextLine}\n\nUser question:\n${question?.slice(0, 2000) || ""}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate a narrative "State of Engineering" report from org metrics.
 * Returns clean Markdown.
 */
async function generateEngineeringNarrative({ orgName, windowDays, metrics }) {
  const model = getModel();

  const prompt = `You are an engineering intelligence analyst writing a "State of Engineering" report for the team "${orgName}", covering the last ${windowDays} days.

Here is the raw data (JSON):
\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`

Write a narrative report in Markdown with these sections:
1. **TL;DR** — 2-3 sentences: the single most important takeaway.
2. **Delivery** — cycle time, review latency, merged PRs; call out trends and what likely drove them.
3. **Team dynamics** — contributor balance, review load, work patterns (after-hours/weekend signals if notable).
4. **Risks & recommendations** — 2-4 concrete, actionable suggestions ranked by impact.

Rules:
- Base every claim strictly on the provided data. Never invent numbers, names, or events.
- If a data point is missing or zero, say so plainly instead of speculating.
- Plain, direct language — write like a sharp colleague, not a consultant. No filler.
- Use the contributors' actual usernames when relevant.
- Keep it under 450 words. Return ONLY Markdown, no code fences.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate a paste-ready standup summary from the last day's activity.
 * Returns clean Markdown grouped by person.
 */
async function generateStandup({ orgName, activity }) {
  const model = getModel();

  const prompt = `You are writing a daily standup summary for the engineering team "${orgName}" based on the last 24 hours of GitHub activity.

Raw activity data (JSON):
\`\`\`json
${JSON.stringify(activity, null, 2)}
\`\`\`

Produce a Markdown standup summary:
- One "### <username>" section per person who had activity, with 1-3 short bullets summarizing what they did (commits grouped by theme, PRs opened/merged, reviews given). Infer themes from commit messages — don't just list every message.
- End with a "### Blockers & watch items" section: PRs still waiting on review or open for a long time, if any in the data; otherwise say "None detected".
- Base everything strictly on the data. No invented work, no praise fluff.
- Keep it tight — this gets pasted into Slack. Return ONLY Markdown, no code fences.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Expand a free-text topic (e.g. "RAG chatbot") into a GitHub search query
 * and a small set of dev.to tags, for the personal Discover feature.
 */
async function expandDiscoveryQuery(topic) {
  const model = getModel();

  const prompt = `A developer wants to explore or build something related to this topic: "${topic}"

Return a JSON object with:
{
  "githubQuery": "a 2-6 word GitHub repository search query for this topic",
  "tags": ["2 to 4 lowercase dev.to tags, single words only, no spaces or hyphens"]
}

Return ONLY valid JSON, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Gemini returned invalid JSON: " + text.slice(0, 200));
  }
}

module.exports = {
  reviewPullRequest,
  reviewCode,
  generateDocumentation,
  generateSprintInsights,
  askAssistant,
  generateEngineeringNarrative,
  generateStandup,
  expandDiscoveryQuery,
};
