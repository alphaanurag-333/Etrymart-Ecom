const crypto = require("crypto");
const { User } = require("../../models");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword, comparePassword } = require("../../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt");
const { toPublicProfile } = require("../../utils/toPublicProfile");
const { generateSixDigitOtp, deliverOtpToPhone } = require("../../utils/vendorPhoneOtpChallenge");
const config = require("../../config");

const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
const REFERRAL_CODE_ATTEMPTS = 8;

function normalizeMobile(value) {
  const raw = String(value ?? "").trim().replace(/\s+/g, "");
  const digits = raw.replace(/\D/g, "");
  return digits;
}

function assertMobile(mobile) {
  if (!mobile || mobile.length < 10 || mobile.length > 15) {
    throw new AppError("Valid mobile number is required", 400);
  }
  return mobile;
}

function assertSixDigitOtp(otp) {
  const s = String(otp ?? "").trim();
  if (!/^\d{6}$/.test(s)) {
    throw new AppError("OTP must be a 6-digit code", 400);
  }
  return s;
}

function assertDeviceId(deviceId) {
  const id = String(deviceId ?? "").trim();
  if (!id || id.length < 8 || id.length > 128) {
    throw new AppError("deviceId is required (8–128 characters)", 400);
  }
  return id;
}

function assertUserCanAuthenticate(user) {
  if (user.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (user.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

function issueAuthTokens(userDoc) {
  const payload = {
    sub: userDoc._id.toString(),
    role: "user",
  };
  return {
    token: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function ensureOwnReferralCode(user) {
  if (user.referral_code) return;
  for (let i = 0; i < REFERRAL_CODE_ATTEMPTS; i += 1) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const taken = await User.exists({ referral_code: code });
    if (!taken) {
      user.referral_code = code;
      return;
    }
  }
  throw new AppError("Could not assign referral code", 500);
}

async function applyReferralOnFirstVerify(user, referralCodeRaw) {
  const code = String(referralCodeRaw ?? "").trim().toUpperCase();
  if (!code || user.referred_by) return;

  const referrer = await User.findOne({ referral_code: code }).select("_id referral_code");
  if (!referrer || referrer._id.equals(user._id)) return;
  if (user.referral_code && code === user.referral_code) return;

  user.referred_by = referrer._id;
  user.referred_by_code_snapshot = code;

  await User.updateOne(
    { _id: referrer._id },
    {
      $push: {
        referrals: {
          user: user._id,
          joined_at: new Date(),
          status: "pending",
        },
      },
    }
  );
}

/** Guest session: stable device id → user row without verified phone. */
exports.guest = asyncHandler(async (req, res) => {
  const deviceId = assertDeviceId(req.body?.deviceId);

  let user = await User.findOne({ deviceId });
  if (!user) {
    try {
      user = await User.create({
        deviceId,
        role: "user",
        isGuest: true,
        phoneVerified: false,
      });
    } catch (err) {
      if (err?.code === 11000) {
        user = await User.findOne({ deviceId });
      }
      if (!user) throw err;
    }
  }

  assertUserCanAuthenticate(user);

  const tokens = issueAuthTokens(user);
  const fresh = await User.findById(user._id);

  res.json({
    status: "true",
    message: "Guest session ready",
    user: toPublicProfile(fresh),
    ...tokens,
  });
});

exports.sendOtp = asyncHandler(async (req, res) => {
  const mobile = assertMobile(normalizeMobile(req.body?.mobile));

  let user = await User.findOne({ mobile });
  const authed = req.user;

  if (user) {
    if (authed && !authed._id.equals(user._id)) {
      throw new AppError(
        "This mobile number is already linked to another account. Sign out of the guest session and log in with OTP.",
        409
      );
    }
  } else if (authed) {
    const me = await User.findById(authed._id);
    if (!me) {
      throw new AppError("Account not found", 401);
    }
    assertUserCanAuthenticate(me);
    if (me.phoneVerified) {
      throw new AppError("Phone already verified on this account", 400);
    }
    if (me.mobile && me.mobile !== mobile) {
      throw new AppError("This session already has a different mobile pending. Use that number or start a new guest session.", 400);
    }
    me.mobile = mobile;
    try {
      await me.save();
    } catch (err) {
      if (err?.code === 11000) {
        throw new AppError(
          "This mobile number is already registered. Sign out and use Send OTP without the guest token to log in.",
          409
        );
      }
      throw err;
    }
    user = me;
  } else {
    try {
      user = await User.create({
        mobile,
        role: "user",
        isGuest: true,
        phoneVerified: false,
      });
    } catch (err) {
      if (err?.code === 11000) {
        user = await User.findOne({ mobile });
      }
      if (!user) throw err;
    }
  }

  assertUserCanAuthenticate(user);

  const plain = generateSixDigitOtp();
  user.otp = await hashPassword(plain);
  user.otpExpire = new Date(Date.now() + LOGIN_OTP_TTL_MS);
  await user.save();

  deliverOtpToPhone(mobile, plain);

  res.json({
    status: "true",
    message: "OTP sent to your mobile number",
    otp: plain,
  });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const mobile = assertMobile(normalizeMobile(req.body?.mobile));
  const otpNorm = assertSixDigitOtp(req.body?.otp);
  const referralCode = req.body?.referralCode;

  const user = await User.findOne({ mobile }).select("+otp +otpExpire");
  if (!user || !user.otp || !user.otpExpire) {
    throw new AppError("Invalid or expired OTP. Request a new code.", 401);
  }
  if (user.otpExpire.getTime() < Date.now()) {
    throw new AppError("OTP has expired. Request a new code.", 401);
  }

  const match = await comparePassword(otpNorm, user.otp);
  if (!match) {
    throw new AppError("Invalid OTP", 401);
  }

  assertUserCanAuthenticate(user);

  const wasVerified = user.phoneVerified;
  user.otp = null;
  user.otpExpire = null;
  user.phoneVerified = true;
  user.isGuest = false;

  if (!wasVerified) {
    await applyReferralOnFirstVerify(user, referralCode);
  }

  await ensureOwnReferralCode(user);
  await user.save();

  const tokens = issueAuthTokens(user);
  const fresh = await User.findById(user._id);

  res.json({
    status: "true",
    message: wasVerified ? "Login successful" : "Mobile verified successfully",
    user: toPublicProfile(fresh),
    ...tokens,
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (payload.role !== "user") {
    throw new AppError("Forbidden", 403);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError("Account not found", 401);
  }

  assertUserCanAuthenticate(user);

  res.json({
    status: "true",
    message: "Token refreshed",
    ...issueAuthTokens(user),
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({
    status: "true",
    message: "Profile fetched successfully",
    user: toPublicProfile(req.user),
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError("Account not found", 404);
  }

  const allowed = [
    "name",
    "email",
    "country",
    "state",
    "city",
    "pincode",
    "gender",
    "profilePicture",
    "fcm_id",
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      user[key] = req.body[key];
    }
  }

  await user.save();

  res.json({
    status: "true",
    message: "Profile updated",
    user: toPublicProfile(user),
  });
});
