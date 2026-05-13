const express = require("express");
const miscController = require("../../controllers/userControllers/miscController");

const router = express.Router();

router.get("/banners", miscController.getActiveBanners);
router.get("/try-on-banners", miscController.getActiveTryOnBanners);
router.get("/categories", miscController.getActiveCategories);
router.get("/subcategories", miscController.getActiveSubCategoriesByCategory);

module.exports = router;
