const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// routes
const healthRoutes = require("./routes/health.route");
app.use("/health", healthRoutes);

module.exports = app;
