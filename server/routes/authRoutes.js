import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

/* =========================================================
   CONFIGURATION
========================================================= */

const VERIFICATION_EXPIRY_MS =
  24 * 60 * 60 * 1000;

const PASSWORD_MIN_LENGTH = 6;
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = "7d";

/* =========================================================
   HELPERS
========================================================= */

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createVerificationToken() {
  const token = crypto
    .randomBytes(32)
    .toString("hex");

  return {
    token,
    hashedToken: hashToken(token),
    expires: new Date(
      Date.now() + VERIFICATION_EXPIRY_MS
    ),
  };
}

function makeToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing.");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role || "user",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    verified: Boolean(user.verified),
    role: user.role || "user",
    active: user.active !== false,
  };
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

/* =========================================================
   REGISTER
========================================================= */

router.post("/register", async (req, res) => {
  try {
    const name = String(
      req.body.name || ""
    ).trim();

    const email = normalizeEmail(
      req.body.email
    );

    const phone = String(
      req.body.phone || ""
    ).trim();

    const password = String(
      req.body.password || ""
    );

    const confirmPassword = String(
      req.body.confirmPassword || ""
    );

    /* -------------------------
       VALIDATION
    ------------------------- */

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required.",
      });
    }

    if (name.length < 2 || name.length > 120) {
      return res.status(400).json({
        success: false,
        message:
          "Name must contain between 2 and 120 characters.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
      });
    }

    if (
      confirmPassword &&
      password !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    /* -------------------------
       DUPLICATE ACCOUNT CHECK
    ------------------------- */

    const existingUser = await User.findOne({
      email,
    }).select("_id verified");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
        verificationRequired:
          !existingUser.verified,
      });
    }

    /* -------------------------
       CREATE USER
    ------------------------- */

    const {
      token: verificationToken,
      hashedToken,
      expires,
    } = createVerificationToken();

    const hashedPassword = await bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,

      role: "user",
      active: true,

      verified: false,

      verificationToken: hashedToken,
      verificationExpires: expires,
    });

    /* -------------------------
       SEND VERIFICATION EMAIL

       IMPORTANT:
       Account remains created if email fails.
    ------------------------- */

    let emailSent = false;

    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: verificationToken,
      });

      emailSent = true;

      console.log(
        `Verification email sent: ${user.email}`
      );
    } catch (emailError) {
      console.error(
        `Verification email failed for ${user.email}:`,
        emailError.message
      );
    }

    return res.status(201).json({
      success: true,

      message: emailSent
        ? "Account created successfully. Please check your email and verify your account before signing in."
        : "Account created successfully, but we could not send the verification email. Please request a new verification email.",

      user: safeUser(user),

      verificationRequired: true,
      emailSent,
    });
  } catch (error) {
    console.error(
      "Register error:",
      error.message
    );

    /* Handle race-condition duplicate email errors */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create account. Please try again.",
    });
  }
});

/* =========================================================
   RESEND VERIFICATION EMAIL
========================================================= */

router.post(
  "/resend-verification",
  async (req, res) => {
    try {
      const email = normalizeEmail(
        req.body.email
      );

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Email is required.",
        });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address.",
        });
      }

      const user = await User.findOne({
        email,
      }).select(
        "+verificationToken +verificationExpires"
      );

      /*
        Generic response for unknown emails.
        This avoids revealing which emails have accounts.
      */

      if (!user) {
        return res.json({
          success: true,
          message:
            "If an unverified account exists, a verification email has been sent.",
        });
      }

      if (user.verified) {
        return res.json({
          success: true,
          message:
            "This account is already verified.",
          alreadyVerified: true,
        });
      }

      if (user.active === false) {
        return res.status(403).json({
          success: false,
          message:
            "This account has been disabled.",
        });
      }

      const {
        token: verificationToken,
        hashedToken,
        expires,
      } = createVerificationToken();

      user.verificationToken =
        hashedToken;

      user.verificationExpires =
        expires;

      await user.save();

      let emailSent = false;

      try {
        await sendVerificationEmail({
          email: user.email,
          name: user.name,
          token: verificationToken,
        });

        emailSent = true;

        console.log(
          `Verification email resent: ${user.email}`
        );
      } catch (emailError) {
        console.error(
          `Resend verification failed for ${user.email}:`,
          emailError.message
        );
      }

      return res.json({
        success: true,

        message: emailSent
          ? "A new verification email has been sent. Please check your inbox."
          : "We could not send the verification email right now. Please try again later.",

        emailSent,
        verificationRequired: true,
      });
    } catch (error) {
      console.error(
        "Resend verification error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to process verification request. Please try again.",
      });
    }
  }
);

/* =========================================================
   VERIFY EMAIL
========================================================= */

router.post("/verify", async (req, res) => {
  try {
    const token = String(
      req.body.token || ""
    ).trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "Verification token is required.",
      });
    }

    const hashedToken =
      hashToken(token);

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpires: {
        $gt: new Date(),
      },
    }).select(
      "+verificationToken +verificationExpires"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification link.",
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message:
          "This account has been disabled.",
      });
    }

    user.verified = true;

    user.verificationToken = undefined;
    user.verificationExpires = undefined;

    await user.save();

    console.log(
      `Email verified successfully: ${user.email}`
    );

    return res.json({
      success: true,
      message:
        "Email verified successfully. You can now sign in.",
      user: safeUser(user),
    });
  } catch (error) {
    console.error(
      "Verify error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify account. Please try again.",
    });
  }
});

/* =========================================================
   LOGIN

   VERIFIED EMAIL IS REQUIRED
========================================================= */

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(
      req.body.email
    );

    const password = String(
      req.body.password || ""
    );

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email,
    }).select(
      "+password +verificationToken +verificationExpires"
    );

    /*
      Use the same response for:
      - account does not exist
      - wrong password
      - disabled account

      This prevents unnecessary account information disclosure.
    */

    if (!user || user.active === false) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* Email verification is mandatory */

    if (!user.verified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email before signing in.",
        verificationRequired: true,
        email: user.email,
      });
    }

    const token = makeToken(user);

    return res.json({
      success: true,
      message:
        "Login successful.",

      token,

      user: safeUser(user),
    });
  } catch (error) {
    console.error(
      "Login error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to login. Please try again.",
    });
  }
});

/* =========================================================
   CURRENT USER
========================================================= */

router.get(
  "/me",
  requireAuth,
  (req, res) => {
    return res.json({
      success: true,
      user: safeUser(req.user),
    });
  }
);

/* =========================================================
   LOGOUT

   JWT logout is handled client-side by deleting
   the stored token.

   This endpoint exists for:
   - frontend consistency
   - future token blacklisting
   - future refresh-token support
========================================================= */

router.post(
  "/logout",
  requireAuth,
  (req, res) => {
    return res.json({
      success: true,
      message:
        "Logged out successfully.",
    });
  }
);

export default router;