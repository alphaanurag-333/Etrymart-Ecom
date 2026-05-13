const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const staticPageController = require("../../controllers/adminControllers/staticPageController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", staticPageController.getAllPages);
router.post("/", staticPageController.createPage);
router.get("/slug/:slug", staticPageController.getPageBySlug);
router.get("/:id", staticPageController.getPageById);
router.patch("/:id", staticPageController.updatePage);
router.delete("/:id", staticPageController.deletePage);

module.exports = router;
