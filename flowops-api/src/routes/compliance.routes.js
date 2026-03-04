const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { requireOwner } = require("../middleware/rbac.middleware");
const {
  exportOrgData,
  deleteOrgData,
  getRetentionPolicy,
  updateRetentionPolicy,
  applyRetention,
} = require("../controllers/compliance.controller");

router.get("/:orgId/export", authenticate, requireOwner, exportOrgData);
router.post("/:orgId/delete", authenticate, requireOwner, deleteOrgData);
router.get("/:orgId/retention", authenticate, requireOwner, getRetentionPolicy);
router.put("/:orgId/retention", authenticate, requireOwner, updateRetentionPolicy);
router.post("/:orgId/retention/apply", authenticate, requireOwner, applyRetention);

module.exports = router;
