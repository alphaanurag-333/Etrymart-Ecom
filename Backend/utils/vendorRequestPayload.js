const { deleteUploadFileByPublicUrl } = require("./deleteUploadFile");
const { publicUploadPathFromFile } = require("./publicUploadPath");

const UPLOAD_FOLDER = "vendor";

function normalizeRequired(value) {
  return String(value ?? "").trim();
}

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function uploadPathFromFiles(req, field) {
  const file = req.files?.[field]?.[0];
  if (!file) return undefined;
  return `/uploads/${UPLOAD_FOLDER}/${file.filename}`;
}

function uploadPathsFromFiles(req, field) {
  const list = req.files?.[field];
  if (!Array.isArray(list) || !list.length) return [];
  return list.map((f) => `/uploads/${UPLOAD_FOLDER}/${f.filename}`);
}

/** Accepts JSON array string (multipart), plain array (JSON body), or undefined. */
function parseStringArrayField(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function uploadedVendorPaths(req) {
  return [
    uploadPathFromFiles(req, "file") ?? publicUploadPathFromFile(req, UPLOAD_FOLDER),
    uploadPathFromFiles(req, "aadhaarCardFront"),
    uploadPathFromFiles(req, "aadhaarCardBack"),
    uploadPathFromFiles(req, "panCardFront") ?? uploadPathFromFiles(req, "panCard"),
    uploadPathFromFiles(req, "shopLogo"),
    ...uploadPathsFromFiles(req, "shopImages"),
    ...uploadPathsFromFiles(req, "shopVideos"),
    uploadPathFromFiles(req, "shopBanner"),
  ].filter(Boolean);
}

function cleanupUploadedVendorFiles(req) {
  uploadedVendorPaths(req).forEach((u) => deleteUploadFileByPublicUrl(u));
}

/** Multer `.fields()` config for vendor profile / KYC uploads. */
const VENDOR_UPLOAD_FIELD_SPECS = [
  { name: "file", maxCount: 1 },
  { name: "aadhaarCardFront", maxCount: 1 },
  { name: "aadhaarCardBack", maxCount: 1 },
  { name: "panCardFront", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
  { name: "shopLogo", maxCount: 1 },
  { name: "shopImages", maxCount: 24 },
  { name: "shopVideos", maxCount: 12 },
  { name: "shopBanner", maxCount: 1 },
];

module.exports = {
  UPLOAD_FOLDER,
  normalizeRequired,
  normalizeOptional,
  uploadPathFromFiles,
  uploadPathsFromFiles,
  parseStringArrayField,
  uploadedVendorPaths,
  cleanupUploadedVendorFiles,
  VENDOR_UPLOAD_FIELD_SPECS,
};
