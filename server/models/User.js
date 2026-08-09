import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // User cannot log in until this becomes true
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // SHA-256 hashed verification token
    verificationToken: {
      type: String,
      default: "",
      select: false,
    },

    // Verification token expiry date
    verificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    // Admin can disable an account without deleting it
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Useful for future account management and security
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =========================================================
   INDEXES
========================================================= */

// Useful for admin/user filtering
userSchema.index({
  role: 1,
  active: 1,
  verified: 1,
});

/* =========================================================
   SAFE JSON
   Prevent sensitive fields from accidentally appearing
   in JSON responses.
========================================================= */

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.verificationToken;
    delete ret.verificationExpires;

    return ret;
  },
});

export default mongoose.model("User", userSchema);