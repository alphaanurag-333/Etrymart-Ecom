// models/other/tryOnBanners.js
const mongoose = require("mongoose");

const tryOnBannerSchema = new mongoose.Schema(
    {
        popupImage: {
            type: String,
            required: true,
            trim: true,
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

module.exports = mongoose.model("TryOnBanner", tryOnBannerSchema);
