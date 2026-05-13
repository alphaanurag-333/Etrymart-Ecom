const AppConfig = require("../../models/bussiness/appConfig");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");

/** Fields safe for unauthenticated storefront / mobile clients (no admin-only or internal pricing). */
const PUBLIC_APP_CONFIG_KEYS = [
  "app_name",
  "app_email",
  "app_mobile",
  "app_detail",
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
];

function singletonLean() {
  return AppConfig.findOne().sort({ updatedAt: -1 }).lean();
}

function pickPublic(doc) {
  const out = {};
  for (const key of PUBLIC_APP_CONFIG_KEYS) {
    if (doc[key] !== undefined && doc[key] !== null) {
      out[key] = doc[key];
    }
  }
  return out;
}

/** GET /api/public/app-config — no auth. */
exports.getPublicAppConfig = asyncHandler(async (req, res) => {
  const doc = await singletonLean();
  if (!doc) {
    throw new AppError("App config not found", 404);
  }
  res.json({
    message: "App config fetched",
    data: pickPublic(doc),
  });
});
