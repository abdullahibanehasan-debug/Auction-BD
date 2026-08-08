import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const makeToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing.");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  verified: !!user.verified,
  role: user.role,
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters.",
      });
    }

    const exists = await User.exists({ email });

    if (exists) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password: await bcrypt.hash(password, 12),
      verificationToken: crypto.randomBytes(32).toString("hex"),
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log(
      `Verification token for ${email}: ${user.verificationToken}`
    );

    res.status(201).json({
      message: "Account created. Please verify your account.",
      user: safeUser(user),
      verificationRequired: true,
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Unable to create account.",
    });
  }
});

// VERIFY
router.post("/verify", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();

    if (!token) {
      return res.status(400).json({
        message: "Verification code is required.",
      });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    }).select("+verificationToken +verificationExpires");

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification code.",
      });
    }

    user.verified = true;
    user.verificationToken = "";
    user.verificationExpires = null;

    await user.save();

    res.json({
      message: "Account verified successfully.",
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Verify error:", error);

    res.status(500).json({
      message: "Unable to verify account.",
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || user.active === false) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    res.json({
      message: "Login successful.",
      token: makeToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Unable to login.",
    });
  }
});

// CURRENT USER
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: safeUser(req.user),
  });
});

// LOGOUT
router.post("/logout", requireAuth, (_req, res) => {
  res.json({
    message: "Logged out successfully.",
  });
});

export default router;