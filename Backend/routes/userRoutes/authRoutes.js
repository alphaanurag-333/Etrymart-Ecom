const express = require("express");
const authController = require("../../controllers/userControllers/authController");
const { protectUser, optionalUser } = require("../../middleware/auth");

const router = express.Router();

router.post("/guest", authController.guest);
router.post("/send-otp", optionalUser, authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/refresh", authController.refresh);
router.get("/me", protectUser, authController.getMe);
router.patch("/me", protectUser, authController.updateMe);

module.exports = router;
