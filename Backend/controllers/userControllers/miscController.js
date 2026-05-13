const Banner = require("../../models/other/banner");
const TryOnBanner = require("../../models/other/tryOnBanners");
const Category = require("../../models/product/category");
const SubCategory = require("../../models/product/subCategory");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");

const ALLOWED_BANNER_TYPES = new Set(["main_banner", "popup_banner", "ads_img_banner", "ads_video_banner"]);

function normalize(value) {
  return String(value ?? "").trim();
}

/** Banners marked active and within optional start/end window (null dates = no restriction). */
function activeBannerDateFilter() {
  const now = new Date();
  return {
    $and: [
      { $or: [{ start_date: null }, { start_date: { $exists: false } }, { start_date: { $lte: now } }] },
      { $or: [{ end_date: null }, { end_date: { $exists: false } }, { end_date: { $gte: now } }] },
    ],
  };
}

exports.getActiveBanners = asyncHandler(async (req, res) => {
  const filter = { status: "active", ...activeBannerDateFilter() };
  const type = normalize(req.query.banner_type);
  if (type) {
    if (!ALLOWED_BANNER_TYPES.has(type)) throw new AppError("Invalid banner_type", 400);
    filter.banner_type = type;
  }
  const banners = await Banner.find(filter).sort({ createdAt: -1 }).lean();
  res.json({
    status: "true",
    message: "Active banners fetched successfully",
    banners,
  });
});

exports.getActiveTryOnBanners = asyncHandler(async (_req, res) => {
  const tryOnBanners = await TryOnBanner.find({ status: "active" }).sort({ createdAt: -1 }).lean();
  res.json({
    status: "true",
    message: "Active try-on banners fetched successfully",
    tryOnBanners,
  });
});

exports.getActiveCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ status: "active" }).sort({ name: 1 }).lean();
  res.json({
    status: "true",
    message: "Active categories fetched successfully",
    categories,
  });
});

exports.getActiveSubCategoriesByCategory = asyncHandler(async (req, res) => {
    const categoryId = normalize(req.query.category);
  
    // Base query
    const query = {
      status: "active",
    };
  
    // If category passed
    if (categoryId) {
      assertObjectId(categoryId, "Invalid category id");
      query.category = categoryId;
    }
  
    const subCategories = await SubCategory.find(query)
      .populate("category", "name status icon")
      .sort({ name: 1 })
      .lean();
  
    res.json({
      status: "true",
      message: "Active subcategories fetched successfully",
      subCategories,
    });
  });