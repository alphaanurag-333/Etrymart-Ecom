const express = require("express");
const vendorAuthController = require("../../controllers/adminControllers/vendorAuthController");
const { protectAdmin } = require("../../middleware/auth");
const { optionalVendorFiles } = require("../../middleware/authMultipart");

const router = express.Router();

router.use(protectAdmin);

router.get("/", vendorAuthController.listVendors);
router.get("/:id", vendorAuthController.getVendorById);
router.post("/", optionalVendorFiles, vendorAuthController.createVendor);
router.patch("/:id", optionalVendorFiles, vendorAuthController.updateVendor);
router.delete("/:id", vendorAuthController.deleteVendor);

module.exports = router;
