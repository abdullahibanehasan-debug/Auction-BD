import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import SellerRequest from "../models/SellerRequest.js";
import Auction from "../models/Auction.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.js";

const router = express.Router();

// =========================
// UPLOADS
// =========================

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "requests"
);

fs.mkdirSync(uploadDir, { recursive: true });

const allowedImages = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `${Date.now()}-${crypto
        .randomBytes(8)
        .toString("hex")}${ext}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    if (allowedImages.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Only JPG, PNG, WEBP and HEIC images are allowed."));
  },
});

// =========================
// CREATE SELLER REQUEST
// =========================

router.post(
  "/",
  requireAuth,
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!req.user.verified) {
        return res.status(403).json({
          message:
            "Please verify your account before submitting an auction request.",
        });
      }

      const title = String(req.body.title || "").trim();
      const category = String(req.body.category || "").trim();
      const categoryGroup = String(
        req.body.categoryGroup || ""
      ).trim();

      const condition = String(
        req.body.condition || ""
      ).trim();

      const description = String(
        req.body.description || ""
      ).trim();

      const location = String(
        req.body.location || ""
      ).trim();

      const notes = String(
        req.body.notes || ""
      ).trim();

      const expectedPrice =
        Number(req.body.expectedPrice) || 0;

      if (
        !title ||
        !category ||
        !categoryGroup ||
        !description
      ) {
        return res.status(400).json({
          message:
            "Title, category, category group and description are required.",
        });
      }

      if (!req.files?.length) {
        return res.status(400).json({
          message: "Please upload at least one photo.",
        });
      }

      const images = req.files.map((file) => ({
        url: `/uploads/requests/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        type: "image",
        size: file.size,
      }));

      const request = await SellerRequest.create({
        userId: req.user._id,

        sellerName: req.user.name,
        sellerEmail: req.user.email,
        sellerPhone: req.user.phone || "",

        title,
        category,
        categoryGroup,
        condition,
        description,
        expectedPrice,
        location,
        notes,

        images,
        videos: [],

        status: "pending",
      });

      res.status(201).json({
        message: "Your auction request has been submitted.",
        request,
      });
    } catch (error) {
      console.error("Seller request error:", error);

      res.status(400).json({
        message:
          error.message || "Unable to submit request.",
      });
    }
  }
);

// =========================
// MY REQUESTS
// =========================

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const requests = await SellerRequest.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (error) {
    console.error("My requests error:", error);

    res.status(500).json({
      message: "Unable to load your requests.",
    });
  }
});

// =========================
// ADMIN - ALL REQUESTS
// =========================

router.get(
  "/admin",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const requests = await SellerRequest.find()
        .sort({ createdAt: -1 })
        .populate("userId", "name email phone verified")
        .lean();

      res.json(requests);
    } catch (error) {
      console.error("Admin requests error:", error);

      res.status(500).json({
        message: "Unable to load seller requests.",
      });
    }
  }
);

// =========================
// ADMIN - REJECT
// =========================

router.patch(
  "/admin/:id/reject",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const request = await SellerRequest.findById(
        req.params.id
      );

      if (!request) {
        return res.status(404).json({
          message: "Request not found.",
        });
      }

      request.status = "rejected";
      request.rejectionReason =
        String(
          req.body.reason || "Request rejected."
        ).trim();

      request.reviewedAt = new Date();
      request.reviewedBy = req.user.email;

      await request.save();

      res.json({
        message: "Request rejected.",
        request,
      });
    } catch (error) {
      console.error("Reject request error:", error);

      res.status(500).json({
        message: "Unable to reject request.",
      });
    }
  }
);

// =========================
// ADMIN - NEED MORE INFO
// =========================

router.patch(
  "/admin/:id/more-info",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const request = await SellerRequest.findById(
        req.params.id
      );

      if (!request) {
        return res.status(404).json({
          message: "Request not found.",
        });
      }

      request.status = "more_info";
      request.adminNotes = String(
        req.body.notes || ""
      ).trim();

      request.reviewedAt = new Date();
      request.reviewedBy = req.user.email;

      await request.save();

      res.json({
        message: "Information request saved.",
        request,
      });
    } catch (error) {
      console.error("More info error:", error);

      res.status(500).json({
        message: "Unable to update request.",
      });
    }
  }
);

// =========================
// ADMIN - APPROVE
// =========================

router.patch(
  "/admin/:id/approve",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const request = await SellerRequest.findById(
        req.params.id
      );

      if (!request) {
        return res.status(404).json({
          message: "Request not found.",
        });
      }

      if (request.status === "approved") {
        return res.status(400).json({
          message:
            "This request has already been approved.",
        });
      }

      const startingPrice =
        Number(request.expectedPrice) || 0;

      const auction = await Auction.create({
        title: request.title,

        category: request.category,

        categoryGroup:
          request.categoryGroup,

        condition:
          request.condition || "",

        description:
          request.description,

        image:
          request.images?.[0]?.url || "",

        images:
          request.images || [],

        startingPrice,

        price: startingPrice,

        bids: 0,

        bidHistory: [],

        seller:
          request.sellerName,

        sellerId:
          request.userId.toString(),

        sellerEmail:
          request.sellerEmail,

        sellerPhone:
          request.sellerPhone || "",

        location:
          request.location || "",

        status: "active",

        approved: true,

        startDate: new Date(),

        commissionRate: 5,
      });

      request.status = "approved";
      request.auctionId = auction._id;
      request.reviewedAt = new Date();
      request.reviewedBy = req.user.email;

      await request.save();

      res.json({
        message:
          "Request approved and auction created.",
        request,
        auction,
      });
    } catch (error) {
      console.error(
        "Approve request error:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Unable to approve request.",
      });
    }
  }
);

export default router;