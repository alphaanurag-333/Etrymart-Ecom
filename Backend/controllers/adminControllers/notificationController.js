const path = require("path");
const firebaseAdmin = require("firebase-admin");
const PushNotification = require("../../models/other/notification");
const User = require("../../models/entity/user");
const Vendor = require("../../models/entity/vendor");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { getPagination, searchFilter } = require("../../utils/listQuery");

const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_AUDIENCE = new Set(["users", "vendors", "all"]);
const NOTIFICATION_UPLOAD_DIR = "notification";
const FIREBASE_SERVICE_ACCOUNT_PATH = path.join(
  __dirname,
  "../../ecom-8f4d7-firebase-adminsdk-fbsvc-d8f0b28010.json",
);

function getFirebaseMessaging() {
  if (!firebaseAdmin.apps.length) {
    const serviceAccount = require(FIREBASE_SERVICE_ACCOUNT_PATH);
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
    });
  }

  return firebaseAdmin.messaging();
}

function normalize(value) {
  return String(value ?? "").trim();
}

function uploaded(req) {
  return req.files?.image?.[0] || req.files?.file?.[0];
}

function filePath(file) {
  return file ? `/uploads/${NOTIFICATION_UPLOAD_DIR}/${file.filename}` : undefined;
}

function absoluteMediaUrl(req, mediaPath) {
  if (!mediaPath || typeof mediaPath !== "string") return undefined;
  if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) return mediaPath;
  return `${req.protocol}://${req.get("host")}${mediaPath}`;
}

function readAudience(value = "users") {
  const audience = normalize(value || "users");
  if (!ALLOWED_AUDIENCE.has(audience)) {
    throw new AppError("Invalid notification audience", 400);
  }
  return audience;
}

async function getRecipientTokens(audience) {
  const queries = [];

  if (audience === "users" || audience === "all") {
    queries.push(User.find({ status: "active", fcm_id: { $nin: [null, ""] } }).select("fcm_id").lean());
  }
  if (audience === "vendors" || audience === "all") {
    queries.push(Vendor.find({ status: "active", fcm_id: { $nin: [null, ""] } }).select("fcm_id").lean());
  }

  const groups = await Promise.all(queries);
  const tokens = groups.flat().map((item) => item.fcm_id).filter(Boolean);
  return [...new Set(tokens)];
}

async function sendPushNotification(req, notification, audience) {
  const tokens = await getRecipientTokens(audience);
  if (tokens.length === 0) {
    return {
      audience,
      attempted: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  const imageUrl = absoluteMediaUrl(req, notification.image);
  const messaging = getFirebaseMessaging();
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += 500) {
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.slice(i, i + 500),
      notification: {
        title: notification.title,
        body: notification.description,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: {
        notificationId: String(notification._id),
        audience,
      },
    });
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return {
    audience,
    attempted: tokens.length,
    successCount,
    failureCount,
  };
}

exports.listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search, audience } = req.query;
  const filter = {};

  if (status) {
    const value = normalize(status);
    if (!ALLOWED_STATUS.has(value)) throw new AppError("Invalid status filter", 400);
    filter.status = value;
  }
  if (audience) {
    filter.audience = readAudience(audience);
  }
  const searchOr = searchFilter(search, ["title", "description"]);
  if (searchOr) Object.assign(filter, searchOr);

  const [notifications, total] = await Promise.all([
    PushNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PushNotification.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "Notifications fetched successfully",
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

exports.getNotificationById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const notification = await PushNotification.findById(req.params.id).lean();
  if (!notification) throw new AppError("Notification not found", 404);
  res.json({ status: "true", message: "Notification fetched successfully", notification });
});

exports.createNotification = asyncHandler(async (req, res) => {
  const title = normalize(req.body.title);
  const description = normalize(req.body.description);
  const status = normalize(req.body.status || "active");
  const audience = readAudience(req.body.audience);
  const imageFromFile = filePath(uploaded(req));

  if (!title || !description) {
    deleteUploadFileByPublicUrl(imageFromFile);
    throw new AppError("Title and description are required", 400);
  }
  if (!ALLOWED_STATUS.has(status)) {
    deleteUploadFileByPublicUrl(imageFromFile);
    throw new AppError("Invalid status", 400);
  }

  try {
    const notification = await PushNotification.create({
      title,
      description,
      audience,
      status,
      image: imageFromFile ?? (normalize(req.body.image) || null),
    });
    const push = status === "active" ? await sendPushNotification(req, notification, audience) : null;
    res.status(201).json({
      status: "true",
      message: "Notification created successfully",
      notification,
      push,
    });
  } catch (error) {
    deleteUploadFileByPublicUrl(imageFromFile);
    throw error;
  }
});

exports.updateNotification = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const notification = await PushNotification.findById(req.params.id);
  const imageFromFile = filePath(uploaded(req));

  if (!notification) {
    deleteUploadFileByPublicUrl(imageFromFile);
    throw new AppError("Notification not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
    const title = normalize(req.body.title);
    if (!title) throw new AppError("Title cannot be empty", 400);
    notification.title = title;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    const description = normalize(req.body.description);
    if (!description) throw new AppError("Description cannot be empty", 400);
    notification.description = description;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    const status = normalize(req.body.status);
    if (!ALLOWED_STATUS.has(status)) throw new AppError("Invalid status", 400);
    notification.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "audience")) {
    notification.audience = readAudience(req.body.audience);
  }
  if (imageFromFile) {
    deleteUploadFileByPublicUrl(notification.image);
    notification.image = imageFromFile;
  } else if (Object.prototype.hasOwnProperty.call(req.body, "image")) {
    deleteUploadFileByPublicUrl(notification.image);
    notification.image = normalize(req.body.image) || null;
  }

  await notification.save();
  res.json({ status: "true", message: "Notification updated successfully", notification });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const notification = await PushNotification.findById(req.params.id);
  if (!notification) throw new AppError("Notification not found", 404);
  deleteUploadFileByPublicUrl(notification.image);
  await PushNotification.findByIdAndDelete(notification._id);
  res.json({ status: "true", message: "Notification deleted successfully" });
});

exports.resendNotification = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const notification = await PushNotification.findById(req.params.id).lean();
  if (!notification) throw new AppError("Notification not found", 404);

  const audience = readAudience(req.body.audience || req.query.audience || notification.audience);
  const push = await sendPushNotification(req, notification, audience);

  res.json({
    status: "true",
    message: "Notification resent successfully",
    notification,
    push,
  });
});
