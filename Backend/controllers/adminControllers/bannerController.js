const Banner = require("../../models/other/banner");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { getPagination, searchFilter } = require("../../utils/listQuery");

const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_TYPES = new Set(["main_banner", "popup_banner", "ads_img_banner", "ads_video_banner"]);
const BANNER_UPLOAD_DIR = "banner";

function normalize(value) {
  return String(value ?? "").trim();
}

function filePath(file) {
  return file ? `/uploads/${BANNER_UPLOAD_DIR}/${file.filename}` : undefined;
}

function uploaded(req, field) {
  return req.files?.[field]?.[0];
}

function firstUploaded(req) {
  return uploaded(req, "file") || uploaded(req, "image") || uploaded(req, "video");
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError("Invalid date", 400);
  return date;
}

function toNumberOrNull(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) throw new AppError(`${field} must be a positive number`, 400);
  return n;
}

function applyMediaFromRequest(req, banner) {
  const image = uploaded(req, "image");
  const video = uploaded(req, "video");
  const file = uploaded(req, "file");

  if (image) {
    deleteUploadFileByPublicUrl(banner.image);
    banner.image = filePath(image);
  }
  if (video) {
    deleteUploadFileByPublicUrl(banner.video);
    banner.video = filePath(video);
  }
  if (file) {
    if (file.mimetype.startsWith("video/")) {
      deleteUploadFileByPublicUrl(banner.video);
      banner.video = filePath(file);
    } else {
      deleteUploadFileByPublicUrl(banner.image);
      banner.image = filePath(file);
    }
  }
}

exports.listBanners = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search, banner_type } = req.query;
  const filter = {};

  if (status) {
    const value = normalize(status);
    if (!ALLOWED_STATUS.has(value)) throw new AppError("Invalid status filter", 400);
    filter.status = value;
  }
  if (banner_type) {
    const value = normalize(banner_type);
    if (!ALLOWED_TYPES.has(value)) throw new AppError("Invalid banner type filter", 400);
    filter.banner_type = value;
  }

  const searchOr = searchFilter(search, ["title", "advertising_link"]);
  if (searchOr) Object.assign(filter, searchOr);

  const [banners, total] = await Promise.all([
    Banner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Banner.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "Banners fetched successfully",
    banners,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

exports.getBannerById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const banner = await Banner.findById(req.params.id).lean();
  if (!banner) throw new AppError("Banner not found", 404);
  res.json({ status: "true", message: "Banner fetched successfully", banner });
});

exports.createBanner = asyncHandler(async (req, res) => {
  const title = normalize(req.body.title);
  const status = normalize(req.body.status || "active");
  const banner_type = normalize(req.body.banner_type || "main_banner");

  if (!title) {
    deleteUploadFileByPublicUrl(filePath(firstUploaded(req)));
    throw new AppError("Title is required", 400);
  }
  if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);
  if (!ALLOWED_TYPES.has(banner_type)) throw new AppError("Invalid banner type", 400);

  try {
    const banner = new Banner({
      title,
      status,
      banner_type,
      start_date: toDate(req.body.start_date),
      end_date: toDate(req.body.end_date),
      pop_up_time: toNumberOrNull(req.body.pop_up_time, "Popup time"),
      advertising_link: normalize(req.body.advertising_link) || null,
      image: normalize(req.body.image) || null,
      video: normalize(req.body.video) || null,
    });
    applyMediaFromRequest(req, banner);
    await banner.save();
    res.status(201).json({ status: "true", message: "Banner created successfully", banner });
  } catch (error) {
    ["file", "image", "video"].forEach((field) => deleteUploadFileByPublicUrl(filePath(uploaded(req, field))));
    throw error;
  }
});

exports.updateBanner = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    ["file", "image", "video"].forEach((field) => deleteUploadFileByPublicUrl(filePath(uploaded(req, field))));
    throw new AppError("Banner not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
    const title = normalize(req.body.title);
    if (!title) throw new AppError("Title cannot be empty", 400);
    banner.title = title;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    const status = normalize(req.body.status);
    if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);
    banner.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "banner_type")) {
    const type = normalize(req.body.banner_type);
    if (!ALLOWED_TYPES.has(type)) throw new AppError("Invalid banner type", 400);
    banner.banner_type = type;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "start_date")) banner.start_date = toDate(req.body.start_date);
  if (Object.prototype.hasOwnProperty.call(req.body, "end_date")) banner.end_date = toDate(req.body.end_date);
  if (Object.prototype.hasOwnProperty.call(req.body, "pop_up_time")) banner.pop_up_time = toNumberOrNull(req.body.pop_up_time, "Popup time");
  if (Object.prototype.hasOwnProperty.call(req.body, "advertising_link")) banner.advertising_link = normalize(req.body.advertising_link) || null;

  if (Object.prototype.hasOwnProperty.call(req.body, "image")) {
    deleteUploadFileByPublicUrl(banner.image);
    banner.image = normalize(req.body.image) || null;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "video")) {
    deleteUploadFileByPublicUrl(banner.video);
    banner.video = normalize(req.body.video) || null;
  }
  applyMediaFromRequest(req, banner);

  await banner.save();
  res.json({ status: "true", message: "Banner updated successfully", banner });
});

exports.deleteBanner = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new AppError("Banner not found", 404);
  deleteUploadFileByPublicUrl(banner.image);
  deleteUploadFileByPublicUrl(banner.video);
  await Banner.findByIdAndDelete(banner._id);
  res.json({ status: "true", message: "Banner deleted successfully" });
});
