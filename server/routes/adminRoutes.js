import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Auction from "../models/Auction.js";
import adminAuth from "../middleware/adminAuth.js";

const router = express.Router();


// ===============================
// ADMIN LOGIN
// ===============================

router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        role: "admin",
        username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Admin login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});


// ===============================
// VERIFY ADMIN SESSION
// ===============================

router.get("/me", adminAuth, (req, res) => {
  res.json({
    authenticated: true,
    role: "admin",
  });
});


// ===============================
// GET ALL AUCTIONS
// ===============================

router.get("/auctions", adminAuth, async (req, res) => {
  try {
    const auctions = await Auction.find()
      .sort({ createdAt: -1 });

    res.json(auctions);
  } catch (error) {
    console.error("Admin get auctions error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});


// ===============================
// CREATE AUCTION
// ===============================

router.post("/auctions", adminAuth, async (req, res) => {
  try {
    const auction = new Auction({
      title: req.body.title,
      category: req.body.category,
      categoryGroup: req.body.categoryGroup,
      price: Number(req.body.price),
      bids: 0,
      time: req.body.time,
      image: req.body.image,
      description: req.body.description || "",
      seller: req.body.seller || "AuctionBD",
      status: req.body.status || "active",
      bidHistory: [],
    });

    const savedAuction = await auction.save();

    res.status(201).json({
      message: "Auction created successfully",
      auction: savedAuction,
    });
  } catch (error) {
    console.error("Create auction error:", error);

    res.status(400).json({
      message: error.message,
    });
  }
});


// ===============================
// UPDATE AUCTION
// ===============================

router.put("/auctions/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid auction ID",
      });
    }

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found",
      });
    }

    if (req.body.title !== undefined) {
      auction.title = req.body.title;
    }

    if (req.body.category !== undefined) {
      auction.category = req.body.category;
    }

    if (req.body.categoryGroup !== undefined) {
      auction.categoryGroup =
        req.body.categoryGroup;
    }

    if (req.body.price !== undefined) {
      auction.price = Number(req.body.price);
    }

    if (req.body.time !== undefined) {
      auction.time = req.body.time;
    }

    if (req.body.image !== undefined) {
      auction.image = req.body.image;
    }

    if (req.body.description !== undefined) {
      auction.description =
        req.body.description;
    }

    if (req.body.seller !== undefined) {
      auction.seller = req.body.seller;
    }

    if (req.body.status !== undefined) {
      auction.status = req.body.status;
    }

    const updatedAuction =
      await auction.save();

    res.json({
      message: "Auction updated successfully",
      auction: updatedAuction,
    });
  } catch (error) {
    console.error("Update auction error:", error);

    res.status(400).json({
      message: error.message,
    });
  }
});


// ===============================
// DELETE AUCTION
// ===============================

router.delete(
  "/auctions/:id",
  adminAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid auction ID",
        });
      }

      const auction =
        await Auction.findByIdAndDelete(id);

      if (!auction) {
        return res.status(404).json({
          message: "Auction not found",
        });
      }

      res.json({
        message: "Auction deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete auction error:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  }
);


export default router;