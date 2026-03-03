const express = require("express");
const router = express.Router();
const { listAuditLogs } = require("../controllers/audit.controller");
const {
  requireAuth,
  requireOrgMember,
} = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/:orgId", requireOrgMember, listAuditLogs);

module.exports = router;
