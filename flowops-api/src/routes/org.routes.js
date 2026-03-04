const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  listMembers,
  addMember,
  updateMemberRole,
  connectRepo,
  listRepos,
  disconnectRepo,
  listRepoContributors,
  generateSprintHealth,
  listSprintHealth,
  deleteSprintHealth,
} = require("../controllers/org.controller");
const {
  requireAuth,
  requireOrgMember,
} = require("../middleware/auth.middleware");

router.use(requireAuth);

// Members
router.get("/:orgId/members", requireOrgMember, listMembers);
router.post("/:orgId/members", requireOrgMember, addMember);
router.put("/:orgId/members/:userId", requireOrgMember, updateMemberRole);

// Repos
router.get("/:orgId/repos", requireOrgMember, listRepos);
router.post("/:orgId/repos", requireOrgMember, connectRepo);
router.delete("/:orgId/repos/:repoId", requireOrgMember, disconnectRepo);
router.get("/:orgId/repos/:repoId/contributors", requireOrgMember, listRepoContributors);

// Sprint Health
router.post("/:orgId/sprint-health", requireOrgMember, generateSprintHealth);
router.get("/:orgId/sprint-health", requireOrgMember, listSprintHealth);
router.delete("/:orgId/sprint-health/:sprintId", requireOrgMember, deleteSprintHealth);

module.exports = router;
