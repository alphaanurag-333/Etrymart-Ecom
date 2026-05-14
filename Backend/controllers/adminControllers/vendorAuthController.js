const { Vendor } = require("../../models");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const { toPublicProfile } = require("../../utils/toPublicProfile");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { assertObjectId } = require("../../utils/assertObjectId");
const { publicUploadPathFromFile } = require("../../utils/publicUploadPath");
const { getPagination, searchFilter } = require("../../utils/listQuery");
const {
  UPLOAD_FOLDER,
  normalizeRequired,
  normalizeOptional,
  uploadPathFromFiles,
  uploadPathsFromFiles,
  parseStringArrayField,
  cleanupUploadedVendorFiles,
} = require("../../utils/vendorRequestPayload");

const REQUIRED_VENDOR_FIELDS = ["name", "email", "phone", "businessName"];

exports.listVendors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, approvalStatus, search } = req.query;

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (approvalStatus) {
    filter.approvalStatus = approvalStatus;
  }
  const searchOr = searchFilter(search, [
    "name",
    "email",
    "phone",
    "businessName",
    "businessPhone",
    "gstin",
    "businessAddress",
    "bankName",
    "branchName",
    "accountNo",
    "ifsc",
  ]);
  if (searchOr) {
    Object.assign(filter, searchOr);
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Vendor.countDocuments(filter),
  ]);

  res.json({
    vendors: vendors.map((v) => toPublicProfile(v)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

exports.getVendorById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const vendor = await Vendor.findById(req.params.id).select("-passwordHash");
  if (!vendor) {
    throw new AppError("Vendor not found", 404);
  }
  res.json({ vendor: toPublicProfile(vendor) });
});

exports.createVendor = asyncHandler(async (req, res) => {
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
    status,
    approvalStatus,
  } = req.body;

  const payload = {
    name: normalizeRequired(name),
    email: normalizeRequired(email).toLowerCase(),
    password: String(password ?? ""),
    phone: normalizeRequired(phone),
    businessName: normalizeRequired(businessName),
  };

  const missing = REQUIRED_VENDOR_FIELDS.some((k) => !payload[k]);
  if (missing) {
    cleanupUploadedVendorFiles(req);
    throw new AppError(
      "Name, email, phone, and business name are required",
      400
    );
  }

  const existing = await Vendor.findOne({ email: payload.email });
  if (existing) {
    cleanupUploadedVendorFiles(req);
    throw new AppError("Email is already in use", 409);
  }
  const existingPhone = await Vendor.findOne({ phone: payload.phone });
  if (existingPhone) {
    cleanupUploadedVendorFiles(req);
    throw new AppError("Phone number is already in use", 409);
  }

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
  const passwordHash = payload.password ? await hashPassword(payload.password) : undefined;
  let vendor;
  try {
    vendor = await Vendor.create({
      name: payload.name,
      email: payload.email,
      ...(passwordHash ? { passwordHash } : {}),
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
      status: status || "active",
      approvalStatus: approvalStatus || "pending",
      profileImage: fromFile ?? normalizeOptional(profileImage),
    });
  } catch (err) {
    cleanupUploadedVendorFiles(req);
    throw err;
  }

  res.status(201).json({
    message: "Vendor created",
    vendor: toPublicProfile(await Vendor.findById(vendor._id)),
  });
});

exports.updateVendor = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    throw new AppError("Vendor not found", 404);
  }

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
    status,
    approvalStatus,
  } = req.body;

  if (email !== undefined) {
    const emailNorm = normalizeRequired(email).toLowerCase();
    if (!emailNorm) {
      cleanupUploadedVendorFiles(req);
      throw new AppError("Email cannot be empty", 400);
    }
    const taken = await Vendor.findOne({
      email: emailNorm,
      _id: { $ne: vendor._id },
    });
    if (taken) {
      cleanupUploadedVendorFiles(req);
      throw new AppError("Email is already in use", 409);
    }
    vendor.email = emailNorm;
  }
  if (phone !== undefined) {
    const phoneNorm = normalizeRequired(phone);
    if (!phoneNorm) throw new AppError("Phone cannot be empty", 400);
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

  if (name !== undefined) {
    const normalized = normalizeRequired(name);
    if (!normalized) throw new AppError("Name cannot be empty", 400);
    vendor.name = normalized;
  }
  if (businessName !== undefined) {
    const normalized = normalizeRequired(businessName);
    if (!normalized) throw new AppError("Business name cannot be empty", 400);
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
  if (status !== undefined) {
    vendor.status = status;
  }
  if (approvalStatus !== undefined) {
    vendor.approvalStatus = approvalStatus;
  }
  if (password) {
    vendor.passwordHash = await hashPassword(password);
  }

  await vendor.save();
  res.json({
    message: "Vendor updated",
    vendor: toPublicProfile(await Vendor.findById(vendor._id)),
  });
});

exports.deleteVendor = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    throw new AppError("Vendor not found", 404);
  }
  const uploadUrls = [
    vendor.profileImage,
    vendor.aadhaarCardFront,
    vendor.aadhaarCardBack,
    vendor.panCardFront,
    vendor.shopLogo,
    ...(vendor.shopImages || []),
    ...(vendor.shopVideos || []),
    vendor.shopBanner,
  ];
  uploadUrls.forEach((u) => deleteUploadFileByPublicUrl(u));
  await Vendor.findByIdAndDelete(req.params.id);
  res.json({ message: "Vendor deleted" });
});
