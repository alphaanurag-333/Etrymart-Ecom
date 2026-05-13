const Coupon = require("../../models/other/coupon");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { getPagination, searchFilter } = require("../../utils/listQuery");

const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_DISCOUNT_TYPES = new Set(["percent", "flat"]);

function normalize(value) {
  return String(value ?? "").trim();
}

function toNumber(value, field) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) throw new AppError(`${field} must be a positive number`, 400);
  return n;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError("Invalid date", 400);
  return date;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertCouponCodeUnique(code, excludeId) {
  const filter = { couponCode: new RegExp(`^${escapeRegex(code)}$`, "i") };
  if (excludeId) filter._id = { $ne: excludeId };
  const exists = await Coupon.findOne(filter).select("_id").lean();
  if (exists) throw new AppError("Coupon code already exists", 409);
}

exports.listCoupons = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search, discountType } = req.query;
  const filter = {};

  if (status) {
    const value = normalize(status);
    if (!ALLOWED_STATUS.has(value)) throw new AppError("Invalid status filter", 400);
    filter.status = value;
  }
  if (discountType) {
    const value = normalize(discountType);
    if (!ALLOWED_DISCOUNT_TYPES.has(value)) throw new AppError("Invalid discount type filter", 400);
    filter.discountType = value;
  }

  const searchOr = searchFilter(search, ["couponTitle", "couponCode"]);
  if (searchOr) Object.assign(filter, searchOr);

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "Coupons fetched successfully",
    coupons,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

exports.getCouponById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const coupon = await Coupon.findById(req.params.id).lean();
  if (!coupon) throw new AppError("Coupon not found", 404);
  res.json({ status: "true", message: "Coupon fetched successfully", coupon });
});

exports.createCoupon = asyncHandler(async (req, res) => {
  const couponTitle = normalize(req.body.couponTitle);
  const couponCode = normalize(req.body.couponCode).toUpperCase();
  const discountType = normalize(req.body.discountType);
  const status = normalize(req.body.status || "active");

  if (!couponTitle || !couponCode || !discountType || req.body.discountAmount === undefined) {
    throw new AppError("Coupon title, code, discount type, and amount are required", 400);
  }
  if (!ALLOWED_DISCOUNT_TYPES.has(discountType)) throw new AppError("Invalid discount type", 400);
  if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);

  await assertCouponCodeUnique(couponCode);

  const coupon = await Coupon.create({
    couponTitle,
    couponCode,
    discountType,
    discountAmount: toNumber(req.body.discountAmount, "Discount amount"),
    minimumPurchase: toNumber(req.body.minimumPurchase ?? 0, "Minimum purchase"),
    startDate: toDate(req.body.startDate),
    expireDate: toDate(req.body.expireDate),
    status,
  });

  res.status(201).json({ status: "true", message: "Coupon created successfully", coupon });
});

exports.updateCoupon = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new AppError("Coupon not found", 404);

  if (Object.prototype.hasOwnProperty.call(req.body, "couponTitle")) {
    const couponTitle = normalize(req.body.couponTitle);
    if (!couponTitle) throw new AppError("Coupon title cannot be empty", 400);
    coupon.couponTitle = couponTitle;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "couponCode")) {
    const couponCode = normalize(req.body.couponCode).toUpperCase();
    if (!couponCode) throw new AppError("Coupon code cannot be empty", 400);
    await assertCouponCodeUnique(couponCode, coupon._id);
    coupon.couponCode = couponCode;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "discountType")) {
    const discountType = normalize(req.body.discountType);
    if (!ALLOWED_DISCOUNT_TYPES.has(discountType)) throw new AppError("Invalid discount type", 400);
    coupon.discountType = discountType;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "discountAmount")) {
    coupon.discountAmount = toNumber(req.body.discountAmount, "Discount amount");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "minimumPurchase")) {
    coupon.minimumPurchase = toNumber(req.body.minimumPurchase, "Minimum purchase");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "startDate")) coupon.startDate = toDate(req.body.startDate);
  if (Object.prototype.hasOwnProperty.call(req.body, "expireDate")) coupon.expireDate = toDate(req.body.expireDate);
  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    const status = normalize(req.body.status);
    if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);
    coupon.status = status;
  }

  await coupon.save();
  res.json({ status: "true", message: "Coupon updated successfully", coupon });
});

exports.deleteCoupon = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new AppError("Coupon not found", 404);
  await Coupon.findByIdAndDelete(coupon._id);
  res.json({ status: "true", message: "Coupon deleted successfully" });
});
