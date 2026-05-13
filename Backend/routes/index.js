const express = require("express");

const adminAuthRoutes = require("./adminRoutes/authRoutes");
const adminAttributeRoutes = require("./adminRoutes/attributeRoutes");
const adminBannerRoutes = require("./adminRoutes/bannerRoutes");
const adminCategoryRoutes = require("./adminRoutes/categoryRoutes");
const adminCouponRoutes = require("./adminRoutes/couponRoutes");
const adminNotificationRoutes = require("./adminRoutes/notificationRoutes");
const adminProductRoutes = require("./adminRoutes/productRoutes");
const adminStaticPageRoutes = require("./adminRoutes/staticPageRoutes");
const adminSubcategoryRoutes = require("./adminRoutes/subcategoryRoutes");
const adminTryOnBannerRoutes = require("./adminRoutes/tryOnBannerRoutes");
const healthRoutes = require("./health.routes");
const userMiscRoutes = require("./userRoutes/miscRoutes");


const router = express.Router();

router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/attributes", adminAttributeRoutes);
router.use("/admin/banners", adminBannerRoutes);
router.use("/admin/categories", adminCategoryRoutes);
router.use("/admin/coupons", adminCouponRoutes);
router.use("/admin/notifications", adminNotificationRoutes);
router.use("/admin/products", adminProductRoutes);
router.use("/admin/pages", adminStaticPageRoutes);
router.use("/admin/subcategories", adminSubcategoryRoutes);
router.use("/admin/try-on-banners", adminTryOnBannerRoutes);
router.use("/user/misc", userMiscRoutes);
router.use("/health", healthRoutes);

module.exports = router;
