const AppConfig = require("../../models/bussiness/appConfig");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");

const UPLOAD_SUBDIR = "app-config";

const ALLOWED_BODY_KEYS = [
  "app_name",
  "app_email",
  "app_mobile",
  "app_detail",
  "admin_logo",
  "user_logo",
  "favicon",
  "website_theme_logo",
  "address",
  "latitude",
  "longitude",
  "facebook",
  "twitter",
  "instagram",
  "linkedin",
  "app_details",
  "app_footer_text",
  "free_coin",
  "defaultTheme",
  "websiteTheme",
  "headerTextColor",
  "payment_methods",
  "commissions",
];

function singletonQuery() {
  return AppConfig.findOne().sort({ updatedAt: -1 });
}

function publicUrlForFile(file) {
  if (!file) return undefined;
  return `/uploads/${UPLOAD_SUBDIR}/${file.filename}`;
}

function uploaded(req, field) {
  return req.files?.[field]?.[0];
}

function normalizeBody(req) {
  if (!req.is("multipart/form-data")) {
    return { ...req.body };
  }
  const b = { ...req.body };
  for (const key of ["payment_methods", "commissions"]) {
    if (typeof b[key] !== "string") continue;
    const s = b[key].trim();
    if (!s) {
      delete b[key];
      continue;
    }
    try {
      b[key] = JSON.parse(s);
    } catch {
      throw new AppError(`Invalid JSON for ${key}`, 400);
    }
  }
  if (b.free_coin !== undefined && b.free_coin !== "") {
    const n = Number(b.free_coin);
    if (!Number.isNaN(n)) b.free_coin = n;
  }
  if (b.defaultTheme !== undefined) {
    b.defaultTheme = b.defaultTheme === true || b.defaultTheme === "true";
  }
  return b;
}

function pickUpdates(body) {
  const out = {};
  for (const key of ALLOWED_BODY_KEYS) {
    if (body[key] === undefined) continue;
    if (key === "payment_methods" || key === "commissions") {
      if (Array.isArray(body[key])) out[key] = body[key];
      continue;
    }
    if (key === "free_coin") {
      const n = Number(body[key]);
      if (!Number.isNaN(n)) out[key] = n;
      continue;
    }
    if (key === "defaultTheme") {
      out[key] = body[key] === true || body[key] === "true";
      continue;
    }
    const v = body[key];
    if (typeof v === "string") {
      out[key] = v.trim();
    } else {
      out[key] = v;
    }
  }
  return out;
}

function applyUploadedFile(req, existing, updates, fileField, docField) {
  const file = uploaded(req, fileField);
  if (!file) return;
  deleteUploadFileByPublicUrl(existing?.[docField]);
  updates[docField] = publicUrlForFile(file);
}

exports.getAppConfig = asyncHandler(async (req, res) => {
  const config = await singletonQuery().lean();
  if (!config) {
    throw new AppError("App config not found", 404);
  }
  res.json({ message: "App config fetched", data: config });
});

/** Creates the single app config if none exists; otherwise updates it. Accepts JSON or multipart (image fields: *_file). */
exports.patchAppConfig = asyncHandler(async (req, res) => {
  const existing = await singletonQuery();
  const body = normalizeBody(req);
  const updates = pickUpdates(body);

  applyUploadedFile(req, existing, updates, "admin_logo_file", "admin_logo");
  applyUploadedFile(req, existing, updates, "user_logo_file", "user_logo");
  applyUploadedFile(req, existing, updates, "favicon_file", "favicon");
  applyUploadedFile(req, existing, updates, "website_theme_logo_file", "website_theme_logo");

  if (!existing) {
    const created = await AppConfig.create(updates);
    return res.status(201).json({
      message: "App config created",
      data: created,
    });
  }

  if (Object.keys(updates).length === 0) {
    return res.json({ message: "App config unchanged", data: existing });
  }

  const updated = await AppConfig.findByIdAndUpdate(
    existing._id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  res.json({ message: "App config updated", data: updated });
});
