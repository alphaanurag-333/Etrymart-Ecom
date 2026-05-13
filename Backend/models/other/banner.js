// models/other/banner.js
const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: false,
      trim: true,
    },
    video: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    banner_type: {
      type: String,
      enum: [
        "main_banner",
        "popup_banner",
        "ads_img_banner",
        "ads_video_banner",
      ],
      default: "main_banner",
    },
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    pop_up_time: {
      type: Number,
      default: null,
    },
    advertising_link: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Banner", bannerSchema);
