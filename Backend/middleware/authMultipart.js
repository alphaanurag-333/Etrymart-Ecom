const createUploader = require("../utils/fileUploader");

function optionalMultipart(uploadMiddleware) {
  return (req, res, next) => {
    if (req.is("multipart/form-data")) {
      return uploadMiddleware(req, res, next);
    }
    next();
  };
}

const adminUpload = createUploader("admin").single("file");
const categoryUpload = createUploader("category").single("file");
const subCategoryUpload = createUploader("sub-category").single("file");
const bannerUpload = createUploader("banner").fields([
  { name: "file", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);
const notificationUpload = createUploader("notification").fields([
  { name: "file", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);
const tryOnBannerUpload = createUploader("try-on-banner").fields([
  { name: "file", maxCount: 1 },
  { name: "popupImage", maxCount: 1 },
]);
/** Thumbnail, gallery images, and dynamic combinationImages0 / combinationImages0_1, etc. */
const productUpload = createUploader("product").any();

exports.optionalAdminFile = optionalMultipart(adminUpload);
exports.optionalCategoryFile = optionalMultipart(categoryUpload);
exports.optionalSubCategoryFile = optionalMultipart(subCategoryUpload);
exports.optionalBannerFiles = optionalMultipart(bannerUpload);
exports.optionalNotificationFile = optionalMultipart(notificationUpload);
exports.optionalTryOnBannerFile = optionalMultipart(tryOnBannerUpload);
exports.optionalProductFiles = optionalMultipart(productUpload);
