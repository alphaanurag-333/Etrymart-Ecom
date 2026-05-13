const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { optionalAppConfigFiles } = require("../../middleware/authMultipart");
const appConfigController = require("../../controllers/adminControllers/appConfigController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", appConfigController.getAppConfig);
router.patch("/", optionalAppConfigFiles, appConfigController.patchAppConfig);

module.exports = router;
