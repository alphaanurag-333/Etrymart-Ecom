const express = require("express");

const adminAuthRoutes = require("./adminRoutes/authRoutes");
const adminAttributeRoutes = require("./adminRoutes/attributeRoutes");
const adminCategoryRoutes = require("./adminRoutes/categoryRoutes");
const adminSubcategoryRoutes = require("./adminRoutes/subcategoryRoutes");
const healthRoutes = require("./health.routes");


const router = express.Router();

router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/attributes", adminAttributeRoutes);
router.use("/admin/categories", adminCategoryRoutes);
router.use("/admin/subcategories", adminSubcategoryRoutes);
router.use("/health", healthRoutes);

module.exports = router;
