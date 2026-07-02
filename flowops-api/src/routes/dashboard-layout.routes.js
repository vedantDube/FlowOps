const express = require("express");
const router = express.Router();
const { requireAuth, requireOrgMember } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  dashboardLayoutQuery,
  createDashboardLayoutBody,
  updateDashboardLayoutBody,
} = require("../utils/validators");
const {
  listDashboardLayouts,
  createDashboardLayout,
  updateDashboardLayout,
  deleteDashboardLayout,
  setDefaultDashboardLayout,
} = require("../controllers/dashboard-layout.controller");

// GET/POST are org-scoped via orgId/organizationId, so requireOrgMember applies directly.
router.get("/", requireAuth, validate({ query: dashboardLayoutQuery }), requireOrgMember, listDashboardLayouts);
router.post("/", requireAuth, validate({ body: createDashboardLayoutBody }), requireOrgMember, createDashboardLayout);

// PUT/DELETE/set-default operate on a layout by id with no orgId in the request —
// ownership/admin authorization is done inline in the controller after loading the row.
router.put("/:id", requireAuth, validate({ body: updateDashboardLayoutBody }), updateDashboardLayout);
router.delete("/:id", requireAuth, deleteDashboardLayout);
router.patch("/:id/set-default", requireAuth, setDefaultDashboardLayout);

module.exports = router;
