const crypto = require("crypto");
const { Vendor } = require("../../models");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword, comparePassword } = require("../../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt");
const { toPublicProfile } = require("../../utils/toPublicProfile");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { publicUploadPathFromFile } = require("../../utils/publicUploadPath");
const {
  UPLOAD_FOLDER,
  normalizeRequired,
  normalizeOptional,
  uploadPathFromFiles,
  uploadPathsFromFiles,
  parseStringArrayField,
  cleanupUploadedVendorFiles,
} = require("../../utils/vendorRequestPayload");
const { generateSixDigitOtp, deliverOtpToPhone } = require("../../utils/vendorPhoneOtpChallenge");
const config = require("../../config");

const REQUIRED_REGISTER_FIELDS = ["name", "email", "password", "phone", "businessName"];
const MIN_PASSWORD_LENGTH = 8;
const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;

function assertSixDigitOtp(otp) {
  const s = String(otp ?? "").trim();
  if (!/^\d{6}$/.test(s)) {
    throw new AppError("OTP must be a 6-digit code", 400);
  }
  return s;
}

function issueAuthTokens(vendor) {
  const payload = {
    sub: vendor._id.toString(),
    role: "vendor",
  };
  return {
    token: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function assertVendorCanAuthenticate(vendor) {
  if (vendor.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (vendor.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
  if (vendor.approvalStatus === "rejected") {
    throw new AppError("Registration was not approved", 403);
  }
  if (vendor.approvalStatus === "suspended") {
    throw new AppError("Account is suspended", 403);
  }
}

/** Send 6-digit OTP to the vendor's registered phone (login). */
exports.sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const phoneNorm = normalizeRequired(phone);
  if (!phoneNorm) {
    throw new AppError("Phone number is required", 400);
  }

  const vendor = await Vendor.findOne({ phone: phoneNorm }).select("+otp +otpExpire");
  if (!vendor) {
    throw new AppError("No vendor account found for this phone number", 404);
  }

  assertVendorCanAuthenticate(vendor);

  const plain = generateSixDigitOtp();
  vendor.otp = await hashPassword(plain);
  vendor.otpExpire = new Date(Date.now() + LOGIN_OTP_TTL_MS);
  await vendor.save();

  deliverOtpToPhone(phoneNorm, plain);

  res.json({
    status: "true",
    message: "OTP sent to your phone number",
    ...(config.nodeEnv !== "production" ? { devOtp: plain } : {}),
  });
});

/** Verify OTP and return access + refresh tokens (login). */
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const phoneNorm = normalizeRequired(phone);
  if (!phoneNorm) {
    throw new AppError("Phone number is required", 400);
  }
  const otpNorm = assertSixDigitOtp(otp);

  const vendor = await Vendor.findOne({ phone: phoneNorm }).select("+passwordHash +otp +otpExpire");
  if (!vendor || !vendor.otp || !vendor.otpExpire) {
    throw new AppError("Invalid or expired OTP. Request a new code.", 401);
  }
  if (vendor.otpExpire.getTime() < Date.now()) {
    throw new AppError("OTP has expired. Request a new code.", 401);
  }

  const match = await comparePassword(otpNorm, vendor.otp);
  if (!match) {
    throw new AppError("Invalid OTP", 401);
  }

  assertVendorCanAuthenticate(vendor);

  vendor.otp = null;
  vendor.otpExpire = null;
  await vendor.save();

  const tokens = issueAuthTokens(vendor);
  const fresh = await Vendor.findById(vendor._id).select("-passwordHash");

  res.json({
    status: "true",
    message: "Login successful",
    user: toPublicProfile(fresh),
    ...tokens,
  });
});

exports.register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    businessName,
    businessPhone,
    gstin,
    businessAddress,
    aadhaarCardFront,
    aadhaarCardBack,
    panCardNumber,
    panCardFront,
    panCard,
    shopLogo,
    shopImages,
    shopVideos,
    shopBanner,
    bankName,
    branchName,
    accountNo,
    ifsc,
    accountType,
    dob,
    gender,
    fcm_id,
    profileImage,
  } = req.body;

  const payload = {
    name: normalizeRequired(name),
    email: normalizeRequired(email).toLowerCase(),
    password: String(password ?? ""),
    phone: normalizeRequired(phone),
    businessName: normalizeRequired(businessName),
  };

  const missingField = REQUIRED_REGISTER_FIELDS.some((k) => !payload[k]);
  if (missingField) {
    cleanupUploadedVendorFiles(req);
    throw new AppError(
      "Name, email, password, phone, and business name are required",
      400
    );
  }
  if (payload.password.length < MIN_PASSWORD_LENGTH) {
    cleanupUploadedVendorFiles(req);
    throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  const existing = await Vendor.findOne({ email: payload.email });
  if (existing) {
    cleanupUploadedVendorFiles(req);
    throw new AppError("Email is already registered", 409);
  }
  const existingPhone = await Vendor.findOne({ phone: payload.phone });
  if (existingPhone) {
    cleanupUploadedVendorFiles(req);
    throw new AppError("Phone number is already in use", 409);
  }

  const passwordHash = await hashPassword(payload.password);
  const fromFile = uploadPathFromFiles(req, "file") ?? publicUploadPathFromFile(req, UPLOAD_FOLDER);
  const aadhaarCardFrontFromFile = uploadPathFromFiles(req, "aadhaarCardFront");
  const aadhaarCardBackFromFile = uploadPathFromFiles(req, "aadhaarCardBack");
  const panCardFromFile =
    uploadPathFromFiles(req, "panCardFront") ?? uploadPathFromFiles(req, "panCard");
  const shopLogoFromFile = uploadPathFromFiles(req, "shopLogo");
  const shopImagesFromFiles = uploadPathsFromFiles(req, "shopImages");
  const shopVideosFromFiles = uploadPathsFromFiles(req, "shopVideos");
  const shopImagesFromBody = parseStringArrayField(shopImages);
  const shopVideosFromBody = parseStringArrayField(shopVideos);
  const shopBannerFromFile = uploadPathFromFiles(req, "shopBanner");

  let vendor;
  try {
    vendor = await Vendor.create({
      name: payload.name,
      email: payload.email,
      passwordHash,
      phone: payload.phone,
      businessName: payload.businessName,
      businessPhone: normalizeOptional(businessPhone),
      gstin: normalizeOptional(gstin),
      panCardNumber: normalizeOptional(panCardNumber),
      businessAddress: normalizeOptional(businessAddress),
      aadhaarCardFront: aadhaarCardFrontFromFile ?? normalizeOptional(aadhaarCardFront),
      aadhaarCardBack: aadhaarCardBackFromFile ?? normalizeOptional(aadhaarCardBack),
      panCardFront: panCardFromFile ?? normalizeOptional(panCardFront ?? panCard),
      shopLogo: shopLogoFromFile ?? normalizeOptional(shopLogo),
      shopImages: [...(shopImagesFromBody ?? []), ...shopImagesFromFiles],
      shopVideos: [...(shopVideosFromBody ?? []), ...shopVideosFromFiles],
      shopBanner: shopBannerFromFile ?? normalizeOptional(shopBanner),
      bankName: normalizeOptional(bankName),
      branchName: normalizeOptional(branchName),
      accountNo: normalizeOptional(accountNo),
      ifsc: normalizeOptional(ifsc),
      accountType,
      dob: dob === "" ? null : dob,
      gender,
      fcm_id: normalizeOptional(fcm_id),
      status: "active",
      approvalStatus: "pending",
      profileImage: fromFile ?? normalizeOptional(profileImage),
    });
  } catch (err) {
    cleanupUploadedVendorFiles(req);
    throw err;
  }

  const tokens = issueAuthTokens(vendor);
  const fresh = await Vendor.findById(vendor._id).select("-passwordHash");

  res.status(201).json({
    status: "true",
    message: "Registration submitted. Your account is pending approval.",
    user: toPublicProfile(fresh),
    ...tokens,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const vendor = await Vendor.findOne({ email: String(email).toLowerCase() }).select(
    "+passwordHash"
  );
  if (!vendor || !vendor.passwordHash) {
    throw new AppError("Invalid email or password", 401);
  }

  const ok = await comparePassword(password, vendor.passwordHash);
  if (!ok) {
    throw new AppError("Invalid email or password", 401);
  }

  assertVendorCanAuthenticate(vendor);

  const tokens = issueAuthTokens(vendor);
  const fresh = await Vendor.findById(vendor._id).select("-passwordHash");

  res.json({
    status: "true",
    message: "Login successful",
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

  if (payload.role !== "vendor") {
    throw new AppError("Forbidden", 403);
  }

  const vendor = await Vendor.findById(payload.sub);
  if (!vendor) {
    throw new AppError("Account not found", 401);
  }

  assertVendorCanAuthenticate(vendor);

  res.json({
    status: "true",
    message: "Token refreshed",
    ...issueAuthTokens(vendor),
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const vendor = await Vendor.findOne({ email: String(email).toLowerCase() });
  if (!vendor) {
    res.json({
      status: "true",
      message:
        "If an account exists for that email, password reset instructions have been sent.",
    });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  vendor.resetPasswordToken = resetToken;
  vendor.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
  await vendor.save();

  res.json({
    status: "true",
    message:
      "If an account exists for that email, password reset instructions have been sent.",
    resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    throw new AppError("Token and new password are required", 400);
  }
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  const vendor = await Vendor.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: new Date() },
  });

  if (!vendor) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  vendor.passwordHash = await hashPassword(password);
  vendor.resetPasswordToken = undefined;
  vendor.resetPasswordExpire = undefined;
  await vendor.save();

  res.json({ status: "true", message: "Password has been reset" });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required", 400);
  }
  if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }
  if (currentPassword === newPassword) {
    throw new AppError("New password must be different from the current password", 400);
  }

  const vendor = await Vendor.findById(req.user._id).select("+passwordHash");
  if (!vendor || !vendor.passwordHash) {
    throw new AppError("Account not found", 404);
  }

  const matches = await comparePassword(currentPassword, vendor.passwordHash);
  if (!matches) {
    throw new AppError("Current password is incorrect", 401);
  }

  vendor.passwordHash = await hashPassword(newPassword);
  vendor.resetPasswordToken = undefined;
  vendor.resetPasswordExpire = undefined;
  await vendor.save();

  res.json({ status: "true", message: "Password updated successfully" });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({
    status: "true",
    message: "Profile fetched successfully",
    user: toPublicProfile(req.user),
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.user._id);
  if (!vendor) {
    throw new AppError("Account not found", 404);
  }

  const {
    name,
    phone,
    businessName,
    businessPhone,
    gstin,
    businessAddress,
    aadhaarCardFront,
    aadhaarCardBack,
    panCardNumber,
    panCardFront,
    panCard,
    shopLogo,
    shopImages,
    shopVideos,
    shopBanner,
    bankName,
    branchName,
    accountNo,
    ifsc,
    accountType,
    dob,
    gender,
    fcm_id,
    profileImage,
  } = req.body;

  if (name !== undefined) {
    const normalized = normalizeRequired(name);
    if (!normalized) {
      cleanupUploadedVendorFiles(req);
      throw new AppError("Name cannot be empty", 400);
    }
    vendor.name = normalized;
  }
  if (phone !== undefined) {
    const phoneNorm = normalizeRequired(phone);
    if (!phoneNorm) {
      cleanupUploadedVendorFiles(req);
      throw new AppError("Phone cannot be empty", 400);
    }
    const phoneTaken = await Vendor.findOne({
      phone: phoneNorm,
      _id: { $ne: vendor._id },
    });
    if (phoneTaken) {
      cleanupUploadedVendorFiles(req);
      throw new AppError("Phone number is already in use", 409);
    }
    vendor.phone = phoneNorm;
  }
  if (businessName !== undefined) {
    const normalized = normalizeRequired(businessName);
    if (!normalized) {
      cleanupUploadedVendorFiles(req);
      throw new AppError("Business name cannot be empty", 400);
    }
    vendor.businessName = normalized;
  }
  if (businessPhone !== undefined) {
    vendor.businessPhone = normalizeOptional(businessPhone);
  }
  if (gstin !== undefined) {
    vendor.gstin = normalizeOptional(gstin);
  }
  if (panCardNumber !== undefined) {
    vendor.panCardNumber = normalizeOptional(panCardNumber);
  }
  if (businessAddress !== undefined) {
    vendor.businessAddress = normalizeOptional(businessAddress);
  }

  const profileImageFromFile = uploadPathFromFiles(req, "file") ?? publicUploadPathFromFile(req, UPLOAD_FOLDER);
  if (profileImageFromFile) {
    deleteUploadFileByPublicUrl(vendor.profileImage);
    vendor.profileImage = profileImageFromFile;
  } else if (Object.prototype.hasOwnProperty.call(req.body, "profileImage")) {
    if (profileImage === "" || profileImage === null) {
      deleteUploadFileByPublicUrl(vendor.profileImage);
      vendor.profileImage = null;
    } else if (profileImage !== vendor.profileImage) {
      deleteUploadFileByPublicUrl(vendor.profileImage);
      vendor.profileImage = profileImage;
    }
  }

  const aadhaarCardFrontFromFile = uploadPathFromFiles(req, "aadhaarCardFront");
  if (aadhaarCardFrontFromFile) {
    deleteUploadFileByPublicUrl(vendor.aadhaarCardFront);
    vendor.aadhaarCardFront = aadhaarCardFrontFromFile;
  } else if (aadhaarCardFront !== undefined) {
    vendor.aadhaarCardFront = normalizeOptional(aadhaarCardFront);
  }
  const aadhaarCardBackFromFile = uploadPathFromFiles(req, "aadhaarCardBack");
  if (aadhaarCardBackFromFile) {
    deleteUploadFileByPublicUrl(vendor.aadhaarCardBack);
    vendor.aadhaarCardBack = aadhaarCardBackFromFile;
  } else if (aadhaarCardBack !== undefined) {
    vendor.aadhaarCardBack = normalizeOptional(aadhaarCardBack);
  }
  const panCardFromFile =
    uploadPathFromFiles(req, "panCardFront") ?? uploadPathFromFiles(req, "panCard");
  if (panCardFromFile) {
    deleteUploadFileByPublicUrl(vendor.panCardFront);
    vendor.panCardFront = panCardFromFile;
  } else if (panCardFront !== undefined || panCard !== undefined) {
    vendor.panCardFront = normalizeOptional(panCardFront ?? panCard);
  }
  const shopLogoFromFile = uploadPathFromFiles(req, "shopLogo");
  if (shopLogoFromFile) {
    deleteUploadFileByPublicUrl(vendor.shopLogo);
    vendor.shopLogo = shopLogoFromFile;
  } else if (shopLogo !== undefined) {
    vendor.shopLogo = normalizeOptional(shopLogo);
  }
  const shopImagesFromFiles = uploadPathsFromFiles(req, "shopImages");
  const shopVideosFromFiles = uploadPathsFromFiles(req, "shopVideos");
  const parsedShopImages = parseStringArrayField(shopImages);
  const parsedShopVideos = parseStringArrayField(shopVideos);

  if (shopImagesFromFiles.length || parsedShopImages !== undefined) {
    const prev = [...(vendor.shopImages || [])];
    let next;
    if (shopImagesFromFiles.length) {
      const base =
        parsedShopImages !== undefined ? parsedShopImages : [...(vendor.shopImages || [])];
      next = [...base, ...shopImagesFromFiles];
    } else {
      next = parsedShopImages;
    }
    prev.filter((u) => u && !next.includes(u)).forEach((u) => deleteUploadFileByPublicUrl(u));
    vendor.shopImages = next;
  }

  if (shopVideosFromFiles.length || parsedShopVideos !== undefined) {
    const prev = [...(vendor.shopVideos || [])];
    let next;
    if (shopVideosFromFiles.length) {
      const base =
        parsedShopVideos !== undefined ? parsedShopVideos : [...(vendor.shopVideos || [])];
      next = [...base, ...shopVideosFromFiles];
    } else {
      next = parsedShopVideos;
    }
    prev.filter((u) => u && !next.includes(u)).forEach((u) => deleteUploadFileByPublicUrl(u));
    vendor.shopVideos = next;
  }
  const shopBannerFromFile = uploadPathFromFiles(req, "shopBanner");
  if (shopBannerFromFile) {
    deleteUploadFileByPublicUrl(vendor.shopBanner);
    vendor.shopBanner = shopBannerFromFile;
  } else if (shopBanner !== undefined) {
    vendor.shopBanner = normalizeOptional(shopBanner);
  }
  if (bankName !== undefined) {
    vendor.bankName = normalizeOptional(bankName);
  }
  if (branchName !== undefined) {
    vendor.branchName = normalizeOptional(branchName);
  }
  if (accountNo !== undefined) {
    vendor.accountNo = normalizeOptional(accountNo);
  }
  if (ifsc !== undefined) {
    vendor.ifsc = normalizeOptional(ifsc);
  }
  if (accountType !== undefined) {
    vendor.accountType = accountType;
  }
  if (dob !== undefined) {
    vendor.dob = dob === "" ? null : dob;
  }
  if (gender !== undefined) {
    vendor.gender = gender;
  }
  if (fcm_id !== undefined) {
    vendor.fcm_id = normalizeOptional(fcm_id);
  }

  await vendor.save();
  const fresh = await Vendor.findById(vendor._id).select("-passwordHash");
  res.json({
    status: "true",
    message: "Profile updated",
    user: toPublicProfile(fresh),
  });
});
