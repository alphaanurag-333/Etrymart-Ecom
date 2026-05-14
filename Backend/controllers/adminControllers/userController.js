const { User } = require("../../models");
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertObjectId } = require("../../utils/assertObjectId");
const { toPublicProfile } = require("../../utils/toPublicProfile");
const { getPagination, searchFilter } = require("../../utils/listQuery");

const USER_STATUS = ["active", "inactive", "blocked"];

exports.listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, phoneVerified, isGuest, search } = req.query;

  const filter = {};
  if (status && USER_STATUS.includes(status)) {
    filter.status = status;
  }
  if (phoneVerified === "true") filter.phoneVerified = true;
  if (phoneVerified === "false") filter.phoneVerified = false;
  if (isGuest === "true") filter.isGuest = true;
  if (isGuest === "false") filter.isGuest = false;

  const searchOr = searchFilter(search, ["name", "email", "mobile", "referral_code", "deviceId"]);
  if (searchOr) {
    Object.assign(filter, searchOr);
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    status: "true",
    message: "Users fetched successfully",
    users: users.map((u) => toPublicProfile(u)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

exports.getUserById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Invalid user id");
  const user = await User.findById(req.params.id).lean();
  if (!user) {
    throw new AppError("User not found", 404);
  }
  res.json({
    status: "true",
    message: "User fetched successfully",
    user: toPublicProfile(user),
  });
});

exports.updateUser = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Invalid user id");
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { status, name, email, country, state, city, pincode, gender, phoneVerified, isGuest } = req.body || {};

  if (status !== undefined) {
    if (!USER_STATUS.includes(status)) {
      throw new AppError("Invalid status", 400);
    }
    user.status = status;
  }
  if (name !== undefined) user.name = name;
  if (email !== undefined) {
    const e = String(email).trim().toLowerCase();
    user.email = e || undefined;
  }
  if (country !== undefined) user.country = country;
  if (state !== undefined) user.state = state;
  if (city !== undefined) user.city = city;
  if (pincode !== undefined) user.pincode = pincode;
  if (gender !== undefined) {
    if (!["male", "female", "other"].includes(gender)) {
      throw new AppError("Invalid gender", 400);
    }
    user.gender = gender;
  }
  if (phoneVerified !== undefined) {
    user.phoneVerified = Boolean(phoneVerified);
  }
  if (isGuest !== undefined) {
    user.isGuest = Boolean(isGuest);
  }

  await user.save();

  res.json({
    status: "true",
    message: "User updated successfully",
    user: toPublicProfile(user),
  });
});
