const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { requireMember } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createIncidentBody, updateIncidentBody } = require("../utils/validators");
const {
  createIncident,
  listIncidents,
  getIncident,
  updateIncident,
  deleteIncident,
} = require("../controllers/incidents.controller");

// Incident reporting is open to any org member (not admin-only) — anyone
// who spots a problem should be able to log it.
router.post("/:orgId", requireAuth, requireMember, validate({ body: createIncidentBody }), createIncident);
router.get("/:orgId", requireAuth, requireMember, listIncidents);
router.get("/:orgId/:incidentId", requireAuth, requireMember, getIncident);
router.patch("/:orgId/:incidentId", requireAuth, requireMember, validate({ body: updateIncidentBody }), updateIncident);
router.delete("/:orgId/:incidentId", requireAuth, requireMember, deleteIncident);

module.exports = router;
