const prisma = require("../services/prisma");

// ── List tasks
exports.listTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const where = { userId: req.userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.personalTask.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create task
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, repoLink, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const task = await prisma.personalTask.create({
      data: {
        title,
        description,
        priority: priority || "medium",
        repoLink,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: req.userId,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.personalTask.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    const { title, description, status, priority, repoLink, dueDate } = req.body;
    const data = { title, description, priority, repoLink };
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (status) {
      data.status = status;
      if (status === "done" && existing.status !== "done") {
        data.completedAt = new Date();
      } else if (status !== "done") {
        data.completedAt = null;
      }
    }

    const task = await prisma.personalTask.update({ where: { id }, data });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.personalTask.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    await prisma.personalTask.delete({ where: { id } });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Task stats
exports.getTaskStats = async (req, res) => {
  try {
    const groups = await prisma.personalTask.groupBy({
      by: ["status"],
      where: { userId: req.userId },
      _count: true,
    });
    const overdue = await prisma.personalTask.count({
      where: {
        userId: req.userId,
        status: { not: "done" },
        dueDate: { lt: new Date() },
      },
    });
    const stats = groups.reduce((acc, g) => ({ ...acc, [g.status]: g._count }), {});
    stats.overdue = overdue;
    stats.total = Object.values(stats).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
