const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { requireOwner } = require("../middleware/rbac.middleware");
const {
  exportOrgData,
  deleteOrgData,
  getRetentionPolicy,
  updateRetentionPolicy,
  applyRetention,
} = require("../controllers/compliance.controller");

router.get("/:orgId/export", requireAuth, requireOwner, exportOrgData);
router.post("/:orgId/delete", requireAuth, requireOwner, deleteOrgData);
router.get("/:orgId/retention", requireAuth, requireOwner, getRetentionPolicy);
router.put("/:orgId/retention", requireAuth, requireOwner, updateRetentionPolicy);
router.post("/:orgId/retention/apply", requireAuth, requireOwner, applyRetention);

module.exports = router;
