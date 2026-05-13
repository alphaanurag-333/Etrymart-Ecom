const Category = require("../../models/product/category");
const SubCategory = require("../../models/product/subCategory");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { getPagination, searchFilter } = require("../../utils/listQuery");

const ALLOWED_STATUS = new Set(["active", "inactive"]);
const SUB_CATEGORY_UPLOAD_DIR = "sub-category";

function normalize(value) {
  return String(value ?? "").trim();
}

function iconPathFromFile(req) {
  if (!req.file) return undefined;
  return `/uploads/${SUB_CATEGORY_UPLOAD_DIR}/${req.file.filename}`;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertCategoryExists(categoryId) {
  assertObjectId(categoryId, "Invalid category id");

  const category = await Category.findById(categoryId).select("_id").lean();
  if (!category) throw new AppError("Category not found", 404);
}

async function assertSubCategoryNameUnique(categoryId, name, excludeId) {
  const filter = {
    category: categoryId,
    name: new RegExp(`^${escapeRegex(name)}$`, "i"),
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const exists = await SubCategory.findOne(filter).select("_id").lean();
  if (exists) throw new AppError("Subcategory name already exists in this category", 409);
}

exports.listSubCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search, category } = req.query;

  const filter = {};
  if (status) {
    const normalizedStatus = normalize(status);
    if (!ALLOWED_STATUS.has(normalizedStatus)) throw new AppError("Invalid status filter", 400);
    filter.status = normalizedStatus;
  }
  if (category) {
    assertObjectId(category, "Invalid category id");
    filter.category = category;
  }

  const searchOr = searchFilter(search, ["name", "description"]);
  if (searchOr) Object.assign(filter, searchOr);

  const [subCategories, total] = await Promise.all([
    SubCategory.find(filter)
      .populate("category", "name status icon")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SubCategory.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "Subcategories fetched successfully",
    subCategories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

exports.getSubCategoryById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);

  const subCategory = await SubCategory.findById(req.params.id)
    .populate("category", "name status icon")
    .lean();
  if (!subCategory) throw new AppError("Subcategory not found", 404);

  res.json({
    status: "true",
    message: "Subcategory fetched successfully",
    subCategory,
  });
});

exports.createSubCategory = asyncHandler(async (req, res) => {
  const name = normalize(req.body.name);
  const description = normalize(req.body.description);
  const category = normalize(req.body.category);
  const status = normalize(req.body.status || "active");
  const iconFromFile = iconPathFromFile(req);

  if (!name || !category) {
    deleteUploadFileByPublicUrl(iconFromFile);
    throw new AppError("Subcategory name and category are required", 400);
  }
  if (!ALLOWED_STATUS.has(status)) {
    deleteUploadFileByPublicUrl(iconFromFile);
    throw new AppError("Invalid status", 400);
  }

  await assertCategoryExists(category);
  await assertSubCategoryNameUnique(category, name);

  try {
    const subCategory = await SubCategory.create({
      name,
      description,
      category,
      status,
      icon: iconFromFile ?? normalize(req.body.icon),
    });
    const fresh = await SubCategory.findById(subCategory._id)
      .populate("category", "name status icon")
      .lean();

    res.status(201).json({
      status: "true",
      message: "Subcategory created successfully",
      subCategory: fresh,
    });
  } catch (error) {
    deleteUploadFileByPublicUrl(iconFromFile);
    throw error;
  }
});

exports.updateSubCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);

  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) {
    deleteUploadFileByPublicUrl(iconPathFromFile(req));
    throw new AppError("Subcategory not found", 404);
  }

  let nextCategory = String(subCategory.category);

  if (Object.prototype.hasOwnProperty.call(req.body, "category")) {
    const category = normalize(req.body.category);
    if (!category) throw new AppError("Category cannot be empty", 400);
    await assertCategoryExists(category);
    subCategory.category = category;
    nextCategory = category;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    const name = normalize(req.body.name);
    if (!name) throw new AppError("Subcategory name cannot be empty", 400);
    await assertSubCategoryNameUnique(nextCategory, name, subCategory._id);
    subCategory.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    subCategory.description = normalize(req.body.description);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    const status = normalize(req.body.status);
    if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);
    subCategory.status = status;
  }

  const iconFromFile = iconPathFromFile(req);
  if (iconFromFile) {
    deleteUploadFileByPublicUrl(subCategory.icon);
    subCategory.icon = iconFromFile;
  } else if (Object.prototype.hasOwnProperty.call(req.body, "icon")) {
    const icon = req.body.icon;
    if (icon === "" || icon === null) {
      deleteUploadFileByPublicUrl(subCategory.icon);
      subCategory.icon = null;
    } else if (icon !== subCategory.icon) {
      deleteUploadFileByPublicUrl(subCategory.icon);
      subCategory.icon = normalize(icon);
    }
  }

  await subCategory.save();
  const fresh = await SubCategory.findById(subCategory._id)
    .populate("category", "name status icon")
    .lean();

  res.json({
    status: "true",
    message: "Subcategory updated successfully",
    subCategory: fresh,
  });
});

exports.deleteSubCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);

  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) throw new AppError("Subcategory not found", 404);

  deleteUploadFileByPublicUrl(subCategory.icon);
  await SubCategory.findByIdAndDelete(subCategory._id);

  res.json({
    status: "true",
    message: "Subcategory deleted successfully",
  });
});
