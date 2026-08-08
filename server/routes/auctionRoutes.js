import express from "express";
import mongoose from "mongoose";
import Auction from "../models/Auction.js";

const router = express.Router();


// GET all auctions
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.find()
      .sort({ createdAt: -1 });

    res.json(auctions);
  } catch (error) {
    console.error("Get auctions error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});


// GET single auction
router.get("/:id", async (req, res) => {
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

    res.json(auction);
  } catch (error) {
    console.error("Get auction error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});


// CREATE auction
router.post("/", async (req, res) => {
  try {
    const auction = new Auction(req.body);

    const savedAuction = await auction.save();

    res.status(201).json(savedAuction);
  } catch (error) {
    console.error("Create auction error:", error);

    res.status(400).json({
      message: error.message,
    });
  }
});


// PLACE BID
router.post("/:id/bids", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, bidder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid auction ID",
      });
    }

    if (!bidder || !bidder.trim()) {
      return res.status(400).json({
        message: "Bidder name is required",
      });
    }

    const bidAmount = Number(amount);

    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({
        message: "Invalid bid amount",
      });
    }

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found",
      });
    }

    if (bidAmount <= auction.price) {
      return res.status(400).json({
        message: `Bid must be higher than ৳${auction.price.toLocaleString(
          "en-BD"
        )}`,
      });
    }

    // Create bid object
    const bid = {
      bidder: bidder.trim(),
      amount: bidAmount,
      createdAt: new Date(),
    };

    // Add bid history
    if (!Array.isArray(auction.bidHistory)) {
      auction.bidHistory = [];
    }

    auction.bidHistory.unshift(bid);

    // Update current price
    auction.price = bidAmount;

    // Update bid count
    auction.bids = auction.bidHistory.length;

    await auction.save();

    res.status(201).json({
      message: "Bid placed successfully",
      auction,
      bid,
    });
  } catch (error) {
    console.error("Place bid error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});


export default router;