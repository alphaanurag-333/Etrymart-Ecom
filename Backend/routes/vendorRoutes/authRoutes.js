const express = require("express");
const authController = require("../../controllers/vendorControllers/authController");
const { protectVendor } = require("../../middleware/auth");
const { optionalVendorFiles } = require("../../middleware/authMultipart");

const router = express.Router();

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/register", optionalVendorFiles, authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", protectVendor, authController.getMe);
router.patch("/me/password", protectVendor, authController.changePassword);
router.patch("/me", protectVendor, optionalVendorFiles, authController.updateMe);

module.exports = router;
