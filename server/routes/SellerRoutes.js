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

const uploadDir = path.resolve(
  process.cwd(),
  "uploads",
  "requests"
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, callback) => {
    callback(null, uploadDir);
  },

  filename: (_, file, callback) => {
    const ext = path.extname(file.originalname);

    callback(
      null,
      `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`
    );
  },
});

const allowedImages = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const allowedVideos = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
];

const upload = multer({
  storage,

  limits: {
    files: 11,
    fileSize: 100 * 1024 * 1024,
  },

  fileFilter: (_, file, callback) => {
    if (
      allowedImages.includes(file.mimetype) ||
      allowedVideos.includes(file.mimetype)
    ) {
      return callback(null, true);
    }

    callback(
      new Error(
        "Only image and video files are allowed."
      )
    );
  },
});

function mediaFromFile(req, file) {
  const isVideo =
    file.mimetype.startsWith("video/");

  return {
    url: `/uploads/requests/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    type: isVideo ? "video" : "image",
    size: file.size,
  };
}

router.post(
  "/",
  requireAuth,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 2 },
  ]),
  async (req, res) => {
    try {
      if (!req.user.verified) {
        return res.status(403).json({
          message:
            "Please verify your account before submitting an auction request.",
        });
      }

      const {
        title,
        category,
        categoryGroup,
        condition,
        description,
        expectedPrice,
        location,
        notes,
      } = req.body;

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

      const images = (
        req.files?.images || []
      ).map((file) =>
        mediaFromFile(req, file)
      );

      const videos = (
        req.files?.videos || []
      ).map((file) =>
        mediaFromFile(req, file)
      );

      if (!images.length) {
        return res.status(400).json({
          message:
            "Please upload at least one photo.",
        });
      }

      const request =
        await SellerRequest.create({
          userId: req.user._id,

          sellerName: req.user.name,
          sellerEmail: req.user.email,
          sellerPhone:
            req.user.phone || "",

          location:
            String(location || "").trim(),

          title,
          category,
          categoryGroup,
          condition,
          description,

          expectedPrice:
            Number(expectedPrice) || 0,

          notes,

          images,
          videos,
        });

      res.status(201).json({
        message:
          "Your auction request has been submitted.",
        request,
      });
    } catch (error) {
      console.error(
        "Seller request error:",
        error
      );

      res.status(400).json({
        message:
          error.message ||
          "Unable to submit request.",
      });
    }
  }
);

router.get(
  "/mine",
  requireAuth,
  async (req, res) => {
    try {
      const requests =
        await SellerRequest.find({
          userId: req.user._id,
        })
          .sort({ createdAt: -1 })
          .lean();

      res.json(requests);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Unable to load your requests.",
      });
    }
  }
);

/* ADMIN */

router.get(
  "/admin",
  requireAuth,
  requireAdmin,
  async (_, res) => {
    try {
      const requests =
        await SellerRequest.find()
          .sort({ createdAt: -1 })
          .populate(
            "userId",
            "name email phone verified"
          )
          .lean();

      res.json(requests);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Unable to load seller requests.",
      });
    }
  }
);

router.patch(
  "/admin/:id/reject",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const request =
        await SellerRequest.findById(
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
      request.reviewedBy =
        req.user.email;

      await request.save();

      res.json({
        message: "Request rejected.",
        request,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Unable to reject request.",
      });
    }
  }
);

router.patch(
  "/admin/:id/more-info",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const request =
        await SellerRequest.findById(
          req.params.id
        );

      if (!request) {
        return res.status(404).json({
          message: "Request not found.",
        });
      }

      request.status = "more_info";
      request.adminNotes =
        String(
          req.body.notes || ""
        ).trim();

      request.reviewedAt = new Date();
      request.reviewedBy =
        req.user.email;

      await request.save();

      res.json({
        message:
          "Information request saved.",
        request,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Unable to update request.",
      });
    }
  }
);

router.patch(
  "/admin/:id/approve",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const request =
        await SellerRequest.findById(
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

      const auction =
        await Auction.create({
          title: request.title,
          category: request.category,
          categoryGroup:
            request.categoryGroup,

          description:
            request.description,

          image:
            request.images[0]?.url || "",

          startingPrice:
            request.expectedPrice || 0,

          price:
            request.expectedPrice || 0,

          seller:
            request.sellerName,

          sellerId:
            request.userId.toString(),

          sellerEmail:
            request.sellerEmail,

          sellerPhone:
            request.sellerPhone,

          status: "active",
          approved: true,

          startDate: new Date(),

          commissionRate: 5,
        });

      request.status = "approved";
      request.auctionId =
        auction._id;

      request.reviewedAt = new Date();
      request.reviewedBy =
        req.user.email;

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
          "Unable to approve request.",
      });
    }
  }
);

export default router;