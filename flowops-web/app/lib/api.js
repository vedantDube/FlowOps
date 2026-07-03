import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // /auth/me is the "am I logged in?" probe — a 401 here just means
    // anonymous/logged-out, which useAuth already handles by leaving user
    // null. Redirecting on it would force-reload the whole app on every
    // anonymous page view, which re-triggers this same probe and loops.
    const isMeCheck = err.config?.url?.includes("/auth/me");
    const alreadyOnLogin = typeof window !== "undefined" && window.location.pathname === "/login";

    // GITHUB_AUTH_EXPIRED is a GitHub token issue, not a session issue —
    // don't redirect to login, let the component handle it (show reconnect prompt)
    const isGithubAuthExpired = err.response?.data?.code === "GITHUB_AUTH_EXPIRED";

    if (err.response?.status === 401 && typeof window !== "undefined" && !isMeCheck && !alreadyOnLogin && !isGithubAuthExpired) {
      localStorage.removeItem("flowops_orgId");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// A GitHub-token-dependent endpoint (personal dashboard/metrics/heatmap/repos)
// returns this shape when the user's stored GitHub token no longer works —
// distinct from a FlowOps session 401, which the interceptor above already
// redirects to /login for. Pages should check this in their .catch() and
// render <GithubReconnectCard /> instead of a generic error toast.
export const isGithubAuthExpiredError = (err) =>
  err?.response?.data?.code === "GITHUB_AUTH_EXPIRED";

// Kicks off the GitHub OAuth flow on the API (not a frontend route) to
// refresh a user's stored access token.
export const githubReconnectUrl = () => `${BASE_URL}/auth/github`;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const fetchMe = () => api.get("/auth/me").then((r) => r.data);
export const logoutRequest = () => api.post("/auth/logout").then((r) => r.data);

// ── Metrics ───────────────────────────────────────────────────────────────────
export const fetchPRCycleTime = (params) =>
  api.get("/metrics/pr-cycle-time", { params }).then((r) => r.data);
export const fetchReviewLatency = (params) =>
  api.get("/metrics/review-latency", { params }).then((r) => r.data);
export const fetchCommitActivity = (params) =>
  api.get("/metrics/commit-activity", { params }).then((r) => r.data);
export const fetchCodeChurn = (params) =>
  api.get("/metrics/code-churn", { params }).then((r) => r.data);
export const fetchTopContributors = (params) =>
  api.get("/metrics/top-contributors", { params }).then((r) => r.data);

// ── DORA Metrics ──────────────────────────────────────────────────────────────
export const fetchDeploymentFrequency = (params) =>
  api.get("/metrics/deployment-frequency", { params }).then((r) => r.data);
export const fetchLeadTime = (params) =>
  api.get("/metrics/lead-time", { params }).then((r) => r.data);
export const fetchChangeFailureRate = (params) =>
  api.get("/metrics/change-failure-rate", { params }).then((r) => r.data);
export const fetchMTTR = (params) =>
  api.get("/metrics/mttr", { params }).then((r) => r.data);

// ── Incidents ─────────────────────────────────────────────────────────────────
export const createIncident = (orgId, data) =>
  api.post(`/incidents/${orgId}`, data).then((r) => r.data);
export const fetchIncidents = (orgId, params) =>
  api.get(`/incidents/${orgId}`, { params }).then((r) => r.data);
export const updateIncident = (orgId, incidentId, data) =>
  api.patch(`/incidents/${orgId}/${incidentId}`, data).then((r) => r.data);
export const deleteIncident = (orgId, incidentId) =>
  api.delete(`/incidents/${orgId}/${incidentId}`).then((r) => r.data);

// ── Dashboard Layouts (Custom Dashboard Builder) ────────────────────────────────
export const fetchDashboardLayouts = (orgId) =>
  api.get("/dashboard-layout", { params: { orgId } }).then((r) => r.data);
export const createDashboardLayout = (organizationId, data) =>
  api.post("/dashboard-layout", { organizationId, ...data }).then((r) => r.data);
export const updateDashboardLayout = (id, data) =>
  api.put(`/dashboard-layout/${id}`, data).then((r) => r.data);
export const deleteDashboardLayout = (id) =>
  api.delete(`/dashboard-layout/${id}`).then((r) => r.data);
export const setDefaultDashboardLayout = (id) =>
  api.patch(`/dashboard-layout/${id}/set-default`).then((r) => r.data);

// ── AI Code Review ────────────────────────────────────────────────────────────
export const triggerAIReview = (pullRequestId) =>
  api.post("/ai/review", { pullRequestId }).then((r) => r.data);
export const reviewCodeFromGithub = (data) =>
  api.post("/ai/review/github", data).then((r) => r.data);
export const fetchAIReviews = (params) =>
  api.get("/ai/reviews", { params }).then((r) => r.data);
export const fetchAIReview = (id) =>
  api.get(`/ai/reviews/${id}`).then((r) => r.data);
export const askAssistant = (data) =>
  api.post("/ai/assistant", data).then((r) => r.data);

// ── Documentation ─────────────────────────────────────────────────────────────
export const generateDoc = (data) =>
  api.post("/docs/generate", data).then((r) => r.data);
export const fetchDocs = (params) =>
  api.get("/docs", { params }).then((r) => r.data);
export const fetchDoc = (id) => api.get(`/docs/${id}`).then((r) => r.data);
export const updateDoc = (id, data) =>
  api.put(`/docs/${id}`, data).then((r) => r.data);
export const deleteDoc = (id) => api.delete(`/docs/${id}`).then((r) => r.data);
export const fetchGithubRepos = () =>
  api.get("/docs/github/repos").then((r) => r.data);
export const fetchRepoTree = (params) =>
  api.get("/docs/github/tree", { params }).then((r) => r.data);
export const fetchRepoContentFromGithub = (data) =>
  api.post("/docs/github/content", data).then((r) => r.data);

// ── Org ───────────────────────────────────────────────────────────────────────
export const fetchOrgMembers = (orgId) =>
  api.get(`/orgs/${orgId}/members`).then((r) => r.data);
export const updateMemberRole = (orgId, userId, role) =>
  api.put(`/orgs/${orgId}/members/${userId}`, { role }).then((r) => r.data);
export const removeMember = (orgId, userId) =>
  api.delete(`/orgs/${orgId}/members/${userId}`).then((r) => r.data);
export const fetchOrgRepos = (orgId) =>
  api.get(`/orgs/${orgId}/repos`).then((r) => r.data);
export const fetchOrgPullRequests = (orgId, params) =>
  api.get(`/orgs/${orgId}/pull-requests`, { params }).then((r) => r.data);
export const connectRepo = (orgId, data) =>
  api.post(`/orgs/${orgId}/repos`, data).then((r) => r.data);
export const disconnectRepo = (orgId, repoId, { purgeData = false } = {}) =>
  api
    .delete(`/orgs/${orgId}/repos/${repoId}`, { params: { purgeData } })
    .then((r) => r.data);
export const fetchRepoContributors = (orgId, repoId) =>
  api.get(`/orgs/${orgId}/repos/${repoId}/contributors`).then((r) => r.data);
export const generateSprintHealth = (orgId, data) =>
  api.post(`/orgs/${orgId}/sprint-health`, data).then((r) => r.data);
export const fetchSprintHealth = (orgId) =>
  api.get(`/orgs/${orgId}/sprint-health`).then((r) => r.data);
export const deleteSprintHealth = (orgId, sprintId) =>
  api.delete(`/orgs/${orgId}/sprint-health/${sprintId}`).then((r) => r.data);

// ── Integrations ──────────────────────────────────────────────────────────────
export const fetchIntegrations = (orgId) =>
  api.get(`/integrations/${orgId}`).then((r) => r.data);
export const saveIntegration = (orgId, data) =>
  api.post(`/integrations/${orgId}`, data).then((r) => r.data);
export const deleteIntegration = (orgId, type) =>
  api.delete(`/integrations/${orgId}/${type}`).then((r) => r.data);
export const fetchJiraProjects = (orgId) =>
  api.get(`/integrations/${orgId}/jira/projects`).then((r) => r.data);

// ── Billing (Razorpay) ────────────────────────────────────────────────────────
export const fetchSubscription = (orgId) =>
  api.get(`/billing/${orgId}/subscription`).then((r) => r.data);
export const createCheckout = (data) =>
  api.post("/billing/checkout", data).then((r) => r.data);
export const verifyPayment = (data) =>
  api.post("/billing/verify", data).then((r) => r.data);
export const cancelPlan = (orgId) =>
  api.post(`/billing/${orgId}/cancel`).then((r) => r.data);

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const fetchAuditLogs = (orgId, params) =>
  api.get(`/audit/${orgId}`, { params }).then((r) => r.data);
// CSV export is a file download, not a JSON fetch — the cookie-based auth
// still applies since this is a same-site <a> navigation, not a fetch() call.
export const auditExportUrl = (orgId, params) => {
  const qs = new URLSearchParams(params || {}).toString();
  return `${BASE_URL}/audit/${orgId}/export${qs ? `?${qs}` : ""}`;
};

// ── Usage Metering (Feature #2) ──────────────────────────────────────────────
export const fetchUsageSummary = (orgId) =>
  api.get(`/usage/${orgId}/summary`).then((r) => r.data);
export const fetchUsageHistory = (orgId) =>
  api.get(`/usage/${orgId}/history`).then((r) => r.data);

// ── Onboarding (Feature #4) ─────────────────────────────────────────────────
export const fetchOnboardingStatus = () =>
  api.get("/onboarding/status").then((r) => r.data);
export const completeOnboarding = () =>
  api.post("/onboarding/complete").then((r) => r.data);

// ── API Keys (Feature #12) ──────────────────────────────────────────────────
export const createApiKey = (orgId, data) =>
  api.post(`/api-keys/${orgId}`, data).then((r) => r.data);
export const fetchApiKeys = (orgId) =>
  api.get(`/api-keys/${orgId}`).then((r) => r.data);
export const revokeApiKey = (orgId, keyId) =>
  api.delete(`/api-keys/${orgId}/${keyId}`).then((r) => r.data);

// ── Public Report (Feature #11) ─────────────────────────────────────────────
export const fetchPublicReport = (slug) =>
  api.get(`/report/${slug}`).then((r) => r.data);

// ── Compliance (Feature #14) ────────────────────────────────────────────────
export const exportOrgData = (orgId) =>
  api.get(`/compliance/${orgId}/export`).then((r) => r.data);
export const deleteOrgData = (orgId, data) =>
  api.post(`/compliance/${orgId}/delete`, data).then((r) => r.data);
export const fetchRetentionPolicy = (orgId) =>
  api.get(`/compliance/${orgId}/retention`).then((r) => r.data);
export const updateRetentionPolicy = (orgId, data) =>
  api.put(`/compliance/${orgId}/retention`, data).then((r) => r.data);

// ── Changelog (Feature #19) ─────────────────────────────────────────────────
export const fetchChangelog = () =>
  api.get("/changelog").then((r) => r.data);

// ── Leaderboard (Feature #9) ────────────────────────────────────────────────
export const fetchLeaderboard = (orgId, params) =>
  api.get(`/leaderboard/${orgId}`, { params }).then((r) => r.data);
export const fetchUserStats = (orgId, username) =>
  api.get(`/leaderboard/${orgId}/${username}`).then((r) => r.data);

// ── Custom Review Rules (Feature #7) ────────────────────────────────────────
export const fetchReviewRules = (orgId) =>
  api.get(`/review-rules/${orgId}`).then((r) => r.data);
export const createReviewRule = (orgId, data) =>
  api.post(`/review-rules/${orgId}`, data).then((r) => r.data);
export const updateReviewRule = (orgId, ruleId, data) =>
  api.put(`/review-rules/${orgId}/${ruleId}`, data).then((r) => r.data);
export const deleteReviewRule = (orgId, ruleId) =>
  api.delete(`/review-rules/${orgId}/${ruleId}`).then((r) => r.data);

// ── Org Branding (Feature #15) ──────────────────────────────────────────────
export const fetchOrgBranding = (orgId) =>
  api.get(`/orgs/${orgId}/branding`).then((r) => r.data);
export const updateOrgBranding = (orgId, data) =>
  api.put(`/orgs/${orgId}/branding`, data).then((r) => r.data);

// ── Notification Preferences (Feature #5) ───────────────────────────────────
export const fetchNotificationPrefs = () =>
  api.get("/notifications/preferences").then((r) => r.data);
export const updateNotificationPrefs = (data) =>
  api.put("/notifications/preferences", data).then((r) => r.data);

// ── Notifications feed ───────────────────────────────────────────────────────
export const fetchNotifications = (orgId) =>
  api.get("/notifications", { params: { orgId } }).then((r) => r.data);
export const markNotificationRead = (id) =>
  api.put(`/notifications/${id}/read`).then((r) => r.data);
export const markAllNotificationsRead = (orgId) =>
  api.put("/notifications/read-all", { orgId }).then((r) => r.data);

// ── PR Automation Rules ──────────────────────────────────────────────────────
export const fetchAutomationRules = (orgId) =>
  api.get(`/automation-rules/${orgId}`).then((r) => r.data);
export const updateAutomationRule = (orgId, data) =>
  api.put(`/automation-rules/${orgId}`, data).then((r) => r.data);
export const triggerAutomationScan = (orgId) =>
  api.post(`/automation-rules/${orgId}/scan`).then((r) => r.data);
export const fetchAutomationImpact = (orgId, days = 7) =>
  api.get(`/automation-rules/${orgId}/impact`, { params: { days } }).then((r) => r.data);

// ── Personal / Individual Developer ─────────────────────────────────────────
export const fetchPersonalDashboard = () =>
  api.get("/personal/dashboard").then((r) => r.data);
export const fetchPersonalMetrics = (params) =>
  api.get("/personal/metrics", { params }).then((r) => r.data);
export const fetchContributionHeatmap = () =>
  api.get("/personal/heatmap").then((r) => r.data);
export const fetchPersonalRepos = () =>
  api.get("/personal/repos").then((r) => r.data);
export const setUserMode = (mode) =>
  api.put("/personal/mode", { mode }).then((r) => r.data);

// ── Developer Profile ───────────────────────────────────────────────────────
export const fetchProfile = () =>
  api.get("/profile/me").then((r) => r.data);
export const updateProfile = (data) =>
  api.put("/profile/me", data).then((r) => r.data);
export const fetchPublicProfile = (username) =>
  api.get(`/profile/${username}`).then((r) => r.data);

// ── Achievements ────────────────────────────────────────────────────────────
export const fetchAchievements = () =>
  api.get("/achievements").then((r) => r.data);
export const checkAchievements = () =>
  api.post("/achievements/check").then((r) => r.data);
export const seedAchievements = () =>
  api.post("/achievements/seed").then((r) => r.data);

// ── Code Snippets ───────────────────────────────────────────────────────────
export const fetchSnippets = (params) =>
  api.get("/snippets", { params }).then((r) => r.data);
export const createSnippet = (data) =>
  api.post("/snippets", data).then((r) => r.data);
export const updateSnippet = (id, data) =>
  api.put(`/snippets/${id}`, data).then((r) => r.data);
export const deleteSnippet = (id) =>
  api.delete(`/snippets/${id}`).then((r) => r.data);
export const toggleSnippetFavorite = (id) =>
  api.post(`/snippets/${id}/favorite`).then((r) => r.data);

// ── Personal Tasks ──────────────────────────────────────────────────────────
export const fetchTasks = (params) =>
  api.get("/tasks", { params }).then((r) => r.data);
export const fetchTaskStats = () =>
  api.get("/tasks/stats").then((r) => r.data);
export const createTask = (data) =>
  api.post("/tasks", data).then((r) => r.data);
export const updateTask = (id, data) =>
  api.put(`/tasks/${id}`, data).then((r) => r.data);
export const deleteTask = (id) =>
  api.delete(`/tasks/${id}`).then((r) => r.data);

// ── Org Invites ─────────────────────────────────────────────────────────────
export const fetchMyInvites = () =>
  api.get("/invites/my").then((r) => r.data);
export const acceptInvite = (token) =>
  api.post(`/invites/accept/${token}`).then((r) => r.data);
export const createOrgInvite = (orgId, data) =>
  api.post(`/invites/${orgId}`, data).then((r) => r.data);
export const fetchOrgInvites = (orgId) =>
  api.get(`/invites/${orgId}`).then((r) => r.data);
export const cancelOrgInvite = (orgId, inviteId) =>
  api.delete(`/invites/${orgId}/${inviteId}`).then((r) => r.data);

export default api;
