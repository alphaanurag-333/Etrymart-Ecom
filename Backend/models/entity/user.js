const mongoose = require("mongoose");

const { Schema } = mongoose;

const REFERRAL_ENTRY_STATUS = ["pending", "successful"];

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    /** Omit until the user sets a real address; never store "" (breaks unique index). */
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    /** Set after OTP verification. Do not store `null`—omit field on guests so sparse unique works. */
    mobile: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    /** Stable id from app (Keychain / Keystore); find/create guest before phone exists. */
    deviceId: {
      type: String,
      trim: true,
      sparse: true,
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
      default: "male",
    },
    /** Optional legacy / extra auth; primary login should be OTP on verified mobile. */
    password: {
      type: String,
      default: null,
      select: false,
    },
    role: {
      type: String,
      required: true,
      default: "user",
      enum: ["user", "seller", "admin"],
    },
    /** Guest = app session before phone OTP; becomes false after mobile is verified. */
    isGuest: {
      type: Boolean,
      default: true,
      index: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Store bcrypt hash only (same pattern as Vendor); never plaintext. */
    otp: {
      type: String,
      default: null,
      select: false,
    },
    otpExpire: {
      type: Date,
      default: null,
      select: false,
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
    /** Issued when user is no longer a phone guest (or on first “real” account creation). */
    referral_code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    referred_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /** Optional: raw code user entered at signup (audit / support). */
    referred_by_code_snapshot: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
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
          enum: REFERRAL_ENTRY_STATUS,
          default: "pending",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.index({ createdAt: -1 });

/** Strip empty email so sparse unique index only applies to real addresses. */
userSchema.pre("validate", function normalizeEmail(next) {
  if (this.email === null || this.email === undefined) {
    return next();
  }
  const t = String(this.email).trim().toLowerCase();
  if (!t) {
    this.set("email", undefined);
  } else {
    this.email = t;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
