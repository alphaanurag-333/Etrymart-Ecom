const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { optionalBannerFiles } = require("../../middleware/authMultipart");
const bannerController = require("../../controllers/adminControllers/bannerController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", bannerController.listBanners);
router.get("/:id", bannerController.getBannerById);
router.post("/", optionalBannerFiles, bannerController.createBanner);
router.patch("/:id", optionalBannerFiles, bannerController.updateBanner);
router.delete("/:id", bannerController.deleteBanner);

module.exports = router;
