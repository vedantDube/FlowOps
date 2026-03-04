const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createInviteBody } = require("../utils/validators");
const { createInvite, listInvites, acceptInvite, cancelInvite, getMyInvites } = require("../controllers/invites.controller");

router.get("/my", requireAuth, getMyInvites);
router.post("/accept/:token", requireAuth, acceptInvite);
router.get("/:orgId", requireAuth, listInvites);
router.post("/:orgId", requireAuth, validate({ body: createInviteBody }), createInvite);
router.delete("/:orgId/:inviteId", requireAuth, cancelInvite);

module.exports = router;
