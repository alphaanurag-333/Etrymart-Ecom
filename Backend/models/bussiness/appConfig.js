const mongoose = require("mongoose");


const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["cod", "online", "wallet"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const commissionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Vendor"],
      required: true,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);


const appConfigSchema = new mongoose.Schema(
  {
    app_name: {
      type: String,
      required: true,
      trim: true,
    },
    app_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    app_mobile: {
      type: String,
      required: true,
    },
    app_detail: {
      type: String,
      default: "",
    },

    admin_logo: {
      type: String,
      default: "",
    },
    user_logo: {
      type: String,
      default: "",
    },
    favicon: {
      type: String,
      default: "",
    },
    website_theme_logo:{
      type: String,
      trim: true
    },
    address: {
      type: String,
      default: "",
    },
    latitude: {
      type: String,
      default: "",
    },
    longitude: {
      type: String,
      default: "",
    },
    facebook: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    instagram: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },

    app_details: {
      type: String,
      default: "",
    },
    app_footer_text: {
      type: String,
      default: "",
    },

    free_coin:{
      type: Number,
      default: 0,
    },

    defaultTheme: {
      type: Boolean,
      default: false
    },
    websiteTheme: {
      type: String,
      trim: true
    },
    website_theme_logo:{
      type: String,
      trim: true
    },
    headerTextColor: {
      type: String,
      trim: true
    },

    payment_methods: {
      type: [paymentMethodSchema],
      default: () => [
        { type: "cod", isActive: true },
        { type: "online", isActive: true },
      ],
    },
    commissions: {
      type: [commissionSchema],
      default: () => [
        { type: "Vendor", percentage: 0 },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppConfig", appConfigSchema);
