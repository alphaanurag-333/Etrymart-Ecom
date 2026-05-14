const Faq = require("../../models/bussiness/faq");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { getPagination, searchFilter } = require("../../utils/listQuery");

const ALLOWED_STATUS = new Set(["active", "inactive"]);

function normalize(value) {
  return String(value ?? "").trim();
}

exports.listFaqs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search } = req.query;
  const filter = {};

  if (status) {
    const value = normalize(status);
    if (!ALLOWED_STATUS.has(value)) throw new AppError("Invalid status filter", 400);
    filter.status = value;
  }

  const searchOr = searchFilter(search, ["question", "answer"]);
  if (searchOr) Object.assign(filter, searchOr);

  const [faqs, total] = await Promise.all([
    Faq.find(filter).sort({ sortOrder: 1, updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Faq.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "FAQs fetched successfully",
    faqs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

exports.createFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.create(req.body);
  res.status(201).json({
    status: "true",
    message: "FAQ created successfully",
    faq,
  });
});

exports.getFaqById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const faq = await Faq.findById(req.params.id).lean();
  if (!faq) {
    throw new AppError("FAQ not found", 404);
  }
  res.json({ status: "true", message: "FAQ fetched successfully", faq });
});

exports.updateFaq = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!faq) {
    throw new AppError("FAQ not found", 404);
  }
  res.json({ status: "true", message: "FAQ updated successfully", faq });
});

exports.deleteFaq = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const faq = await Faq.findByIdAndDelete(req.params.id);
  if (!faq) {
    throw new AppError("FAQ not found", 404);
  }
  res.json({ status: "true", message: "FAQ deleted successfully" });
});
