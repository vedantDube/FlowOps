const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createTaskBody, updateTaskBody } = require("../utils/validators");
const { listTasks, createTask, updateTask, deleteTask, getTaskStats } = require("../controllers/tasks.controller");

router.get("/", requireAuth, listTasks);
router.get("/stats", requireAuth, getTaskStats);
router.post("/", requireAuth, validate({ body: createTaskBody }), createTask);
router.put("/:id", requireAuth, validate({ body: updateTaskBody }), updateTask);
router.delete("/:id", requireAuth, deleteTask);

module.exports = router;
