import express from "express";
import mongoose from "mongoose";
import Auction from "../models/Auction.js";

const router = express.Router();


// GET all auctions
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.find().sort({
      createdAt: -1,
    });

    res.json(auctions);

  } catch (error) {
    console.error("Error fetching auctions:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});


// GET single auction
router.get("/:id", async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid auction ID",
      });
    }

    const auction = await Auction.findById(
      req.params.id
    );

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found",
      });
    }

    res.json(auction);

  } catch (error) {
    console.error("Error fetching auction:", error);

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

    console.error("Error creating auction:", error);

    res.status(400).json({
      message: error.message,
    });

  }
});


export default router;