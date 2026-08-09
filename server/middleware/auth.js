import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =========================================================
   REQUIRE LOGIN
========================================================= */

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Login required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid login session.",
      });
    }

    const user = await User.findById(decoded.id).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled.",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your login session has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid login session.",
      });
    }

    console.error("Auth error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}

/* =========================================================
   REQUIRE VERIFIED EMAIL

   Use this AFTER requireAuth on routes such as bidding.
========================================================= */

export function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Login required.",
    });
  }

  if (req.user.verified !== true) {
    return res.status(403).json({
      success: false,
      code: "EMAIL_NOT_VERIFIED",
      message:
        "Please verify your email before accessing this feature or placing bids.",
    });
  }

  return next();
}

/* =========================================================
   REQUIRE ADMIN
========================================================= */

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Login required.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  return next();
}