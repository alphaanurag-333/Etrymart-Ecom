const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const couponController = require("../../controllers/adminControllers/couponController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", couponController.listCoupons);
router.get("/:id", couponController.getCouponById);
router.post("/", couponController.createCoupon);
router.patch("/:id", couponController.updateCoupon);
router.delete("/:id", couponController.deleteCoupon);

module.exports = router;
