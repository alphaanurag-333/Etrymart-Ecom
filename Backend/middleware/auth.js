const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");
const { User, Vendor, Admin } = require("../models");

function readBearer(req) {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function assertActiveAccount(doc) {
  if (doc.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (doc.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

function protect(role, Model, select) {
  return asyncHandler(async (req, res, next) => {
    const token = readBearer(req);
    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    if (payload.role !== role) {
      throw new AppError("Forbidden", 403);
    }

    let query = Model.findById(payload.sub);
    if (select != null && String(select).trim() !== "") {
      query = query.select(select);
    }
    const account = await query;
    if (!account) {
      throw new AppError("Account not found", 401);
    }

    assertActiveAccount(account);

    req.user = account;
    req.auth = { role, sub: payload.sub };
    next();
  });
}

/** If a valid user Bearer token is present, sets `req.user`; otherwise continues without error. */
const optionalUser = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) {
    return next();
  }
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next();
  }
  if (payload.role !== "user") {
    return next();
  }
  const account = await User.findById(payload.sub);
  if (!account) {
    return next();
  }
  try {
    assertActiveAccount(account);
  } catch {
    return next();
  }
  req.user = account;
  req.auth = { role: "user", sub: payload.sub };
  next();
});

module.exports = {
  optionalUser,
  protectUser: protect("user", User),
  protectVendor: protect("vendor", Vendor, "-passwordHash"),
  protectAdmin: protect("admin", Admin, "-password"),
};
