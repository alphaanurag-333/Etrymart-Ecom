const Category = require("../../models/product/category");
const SubCategory = require("../../models/product/subCategory");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { getPagination, searchFilter } = require("../../utils/listQuery");

const ALLOWED_STATUS = new Set(["active", "inactive"]);
const CATEGORY_UPLOAD_DIR = "category";

function normalize(value) {
  return String(value ?? "").trim();
}

function iconPathFromFile(req) {
  if (!req.file) return undefined;
  return `/uploads/${CATEGORY_UPLOAD_DIR}/${req.file.filename}`;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertCategoryNameUnique(name, excludeId) {
  const filter = { name: new RegExp(`^${escapeRegex(name)}$`, "i") };
  if (excludeId) filter._id = { $ne: excludeId };

  const exists = await Category.findOne(filter).select("_id").lean();
  if (exists) throw new AppError("Category name already exists", 409);
}

exports.listCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search } = req.query;

  const filter = {};
  if (status) {
    const normalizedStatus = normalize(status);
    if (!ALLOWED_STATUS.has(normalizedStatus)) throw new AppError("Invalid status filter", 400);
    filter.status = normalizedStatus;
  }

  const searchOr = searchFilter(search, ["name", "description"]);
  if (searchOr) Object.assign(filter, searchOr);

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "Categories fetched successfully",
    categories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

exports.getCategoryById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);

  const category = await Category.findById(req.params.id).lean();
  if (!category) throw new AppError("Category not found", 404);

  res.json({
    status: "true",
    message: "Category fetched successfully",
    category,
  });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const name = normalize(req.body.name);
  const description = normalize(req.body.description);
  const status = normalize(req.body.status || "active");
  const iconFromFile = iconPathFromFile(req);

  if (!name) {
    deleteUploadFileByPublicUrl(iconFromFile);
    throw new AppError("Category name is required", 400);
  }
  if (!ALLOWED_STATUS.has(status)) {
    deleteUploadFileByPublicUrl(iconFromFile);
    throw new AppError("Invalid status", 400);
  }

  await assertCategoryNameUnique(name);

  try {
    const category = await Category.create({
      name,
      description,
      status,
      icon: iconFromFile ?? normalize(req.body.icon),
    });

    res.status(201).json({
      status: "true",
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    deleteUploadFileByPublicUrl(iconFromFile);
    throw error;
  }
});

exports.updateCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);

  const category = await Category.findById(req.params.id);
  if (!category) {
    deleteUploadFileByPublicUrl(iconPathFromFile(req));
    throw new AppError("Category not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    const name = normalize(req.body.name);
    if (!name) throw new AppError("Category name cannot be empty", 400);
    await assertCategoryNameUnique(name, category._id);
    category.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    category.description = normalize(req.body.description);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    const status = normalize(req.body.status);
    if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);
    category.status = status;
  }

  const iconFromFile = iconPathFromFile(req);
  if (iconFromFile) {
    deleteUploadFileByPublicUrl(category.icon);
    category.icon = iconFromFile;
  } else if (Object.prototype.hasOwnProperty.call(req.body, "icon")) {
    const icon = req.body.icon;
    if (icon === "" || icon === null) {
      deleteUploadFileByPublicUrl(category.icon);
      category.icon = null;
    } else if (icon !== category.icon) {
      deleteUploadFileByPublicUrl(category.icon);
      category.icon = normalize(icon);
    }
  }

  await category.save();

  res.json({
    status: "true",
    message: "Category updated successfully",
    category,
  });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);

  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError("Category not found", 404);

  const linkedSubCategories = await SubCategory.countDocuments({ category: category._id });
  if (linkedSubCategories > 0) {
    throw new AppError("Cannot delete category with existing subcategories", 409);
  }

  deleteUploadFileByPublicUrl(category.icon);
  await Category.findByIdAndDelete(category._id);

  res.json({
    status: "true",
    message: "Category deleted successfully",
  });
});
