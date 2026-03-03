const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  saveIntegration,
  listIntegrations,
  deleteIntegration,
  getJiraProjects,
  getJiraIssues,
} = require("../controllers/integrations.controller");
const {
  requireAuth,
  requireOrgMember,
} = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/:orgId", requireOrgMember, listIntegrations);
router.post("/:orgId", requireOrgMember, saveIntegration);
router.delete("/:orgId/:type", requireOrgMember, deleteIntegration);

// Jira specific
router.get("/:orgId/jira/projects", requireOrgMember, getJiraProjects);
router.get(
  "/:orgId/jira/projects/:projectKey/issues",
  requireOrgMember,
  getJiraIssues,
);

module.exports = router;
