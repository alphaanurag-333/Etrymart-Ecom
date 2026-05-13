const express = require("express");

const adminAuthRoutes = require("./adminRoutes/authRoutes");
const healthRoutes = require("./health.routes");


const router = express.Router();

router.use("/admin/auth", adminAuthRoutes);
router.use("/health", healthRoutes);

module.exports = router;
