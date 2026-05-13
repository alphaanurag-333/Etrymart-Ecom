const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { optionalTryOnBannerFile } = require("../../middleware/authMultipart");
const tryOnBannerController = require("../../controllers/adminControllers/tryOnBannerController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", tryOnBannerController.listTryOnBanners);
router.get("/:id", tryOnBannerController.getTryOnBannerById);
router.post("/", optionalTryOnBannerFile, tryOnBannerController.createTryOnBanner);
router.patch("/:id", optionalTryOnBannerFile, tryOnBannerController.updateTryOnBanner);
router.delete("/:id", tryOnBannerController.deleteTryOnBanner);

module.exports = router;
