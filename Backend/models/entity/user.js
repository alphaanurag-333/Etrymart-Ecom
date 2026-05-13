const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    mobile: {
      type: String,
      required: [true, "Mobile field is required"],
      unique: true,
    },
    country: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    pincode: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      required: true,
      default: "user",
      enum: ["user", "seller", "admin"],
    },
    otp: {
      type: String,
      required: true,
      default: "0000",
    },
    profilePicture: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive", "blocked"],
    },

    fcm_id: {
      type: String,
      default: "",
    },
    wallet_amount: {
      type: Number,
      default: 0,
    },
    daily_coins: {
      coins: {
        type: Number,
        default: 0,
      },
      last_updated: {
        type: Date,
        default: Date.now,
      },
    },
    referral_coins: [
      {
        coins: {
          type: Number,
          required: true,
        },
        earned_at: {
          type: Date,
          default: Date.now,
        },
        expires_at: {
          type: Date,
        },
        is_expired: {
          type: Boolean,
          default: false,
        },
      },
    ],
    total_referral_coins: {
      type: Number,
      default: 0,
    },
    referral_code: {
      type: String,
      unique: true,
      sparse: true,
    },
    referred_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referrals: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        joined_at: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['pending', 'successful'],
          default: 'pending'
        }
      },
    ],
  },
  {
    timestamps: true
  }
);




module.exports = mongoose.model("User", userSchema);
