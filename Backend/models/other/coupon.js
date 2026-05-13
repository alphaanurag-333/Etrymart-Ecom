// models/other/coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    couponTitle: {
      type: String,
      required: true,
      trim: true,
    },
    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ["percent", "flat"],
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumPurchase: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: false,
    },
    expireDate: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Coupon", couponSchema);
