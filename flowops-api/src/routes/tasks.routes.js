const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { listTasks, createTask, updateTask, deleteTask, getTaskStats } = require("../controllers/tasks.controller");

router.get("/", requireAuth, listTasks);
router.get("/stats", requireAuth, getTaskStats);
router.post("/", requireAuth, createTask);
router.put("/:id", requireAuth, updateTask);
router.delete("/:id", requireAuth, deleteTask);

module.exports = router;
