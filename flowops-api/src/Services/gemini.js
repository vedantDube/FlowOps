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
async function reviewPullRequest({ title, body, diff, repoName }) {
  const model = getModel();

  const prompt = `You are an expert software engineer performing a code review.

Repository: ${repoName}
PR Title: ${title}
PR Description: ${body || "No description provided."}

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
async function reviewCode({ code, fileName, repoName }) {
  const model = getModel();

  const prompt = `You are an expert software engineer performing a thorough code review.

Repository: ${repoName || "Unknown"}
File: ${fileName || "Unknown"}

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

module.exports = {
  reviewPullRequest,
  reviewCode,
  generateDocumentation,
  generateSprintInsights,
};
