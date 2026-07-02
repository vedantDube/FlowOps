const express = require("express");
const router = express.Router();
const { listAuditLogs, exportAuditLogsCsv } = require("../controllers/audit.controller");
const {
  requireAuth,
  requireOrgMember,
} = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/:orgId", requireOrgMember, listAuditLogs);
router.get("/:orgId/export", requireOrgMember, exportAuditLogsCsv);

module.exports = router;
