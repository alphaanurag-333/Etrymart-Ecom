const TryOnBanner = require("../../models/other/tryOnBanners");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { getPagination } = require("../../utils/listQuery");

const ALLOWED_STATUS = new Set(["active", "inactive"]);
const TRY_ON_UPLOAD_DIR = "try-on-banner";

function normalize(value) {
  return String(value ?? "").trim();
}

function uploaded(req) {
  return req.files?.popupImage?.[0] || req.files?.file?.[0];
}

function filePath(file) {
  return file ? `/uploads/${TRY_ON_UPLOAD_DIR}/${file.filename}` : undefined;
}

exports.listTryOnBanners = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status } = req.query;
  const filter = {};

  if (status) {
    const value = normalize(status);
    if (!ALLOWED_STATUS.has(value)) throw new AppError("Invalid status filter", 400);
    filter.status = value;
  }

  const [tryOnBanners, total] = await Promise.all([
    TryOnBanner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    TryOnBanner.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "Try-on banners fetched successfully",
    tryOnBanners,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

exports.getTryOnBannerById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const tryOnBanner = await TryOnBanner.findById(req.params.id).lean();
  if (!tryOnBanner) throw new AppError("Try-on banner not found", 404);
  res.json({ status: "true", message: "Try-on banner fetched successfully", tryOnBanner });
});

exports.createTryOnBanner = asyncHandler(async (req, res) => {
  const status = normalize(req.body.status || "active");
  const popupImageFromFile = filePath(uploaded(req));
  const popupImage = popupImageFromFile ?? normalize(req.body.popupImage);

  if (!popupImage) throw new AppError("Popup image is required", 400);
  if (!ALLOWED_STATUS.has(status)) {
    deleteUploadFileByPublicUrl(popupImageFromFile);
    throw new AppError("Invalid status", 400);
  }

  try {
    const tryOnBanner = await TryOnBanner.create({ popupImage, status });
    res.status(201).json({ status: "true", message: "Try-on banner created successfully", tryOnBanner });
  } catch (error) {
    deleteUploadFileByPublicUrl(popupImageFromFile);
    throw error;
  }
});

exports.updateTryOnBanner = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const tryOnBanner = await TryOnBanner.findById(req.params.id);
  const popupImageFromFile = filePath(uploaded(req));

  if (!tryOnBanner) {
    deleteUploadFileByPublicUrl(popupImageFromFile);
    throw new AppError("Try-on banner not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    const status = normalize(req.body.status);
    if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);
    tryOnBanner.status = status;
  }
  if (popupImageFromFile) {
    deleteUploadFileByPublicUrl(tryOnBanner.popupImage);
    tryOnBanner.popupImage = popupImageFromFile;
  } else if (Object.prototype.hasOwnProperty.call(req.body, "popupImage")) {
    const popupImage = normalize(req.body.popupImage);
    if (!popupImage) throw new AppError("Popup image cannot be empty", 400);
    deleteUploadFileByPublicUrl(tryOnBanner.popupImage);
    tryOnBanner.popupImage = popupImage;
  }

  await tryOnBanner.save();
  res.json({ status: "true", message: "Try-on banner updated successfully", tryOnBanner });
});

exports.deleteTryOnBanner = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const tryOnBanner = await TryOnBanner.findById(req.params.id);
  if (!tryOnBanner) throw new AppError("Try-on banner not found", 404);
  deleteUploadFileByPublicUrl(tryOnBanner.popupImage);
  await TryOnBanner.findByIdAndDelete(tryOnBanner._id);
  res.json({ status: "true", message: "Try-on banner deleted successfully" });
});
