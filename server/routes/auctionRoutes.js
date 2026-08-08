import express from "express";
import mongoose from "mongoose";

import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const validId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const clean = (value = "") =>
  String(value).trim();

const email = (value = "") =>
  clean(value).toLowerCase();

async function expireAuctions() {
  await Auction.updateMany(
    {
      status: "active",
      approved: true,
      deleted: false,
      endDate: {
        $ne: null,
        $lte: new Date(),
      },
    },
    {
      $set: { status: "ended" },
    }
  );
}

/* =========================
   GET PUBLIC AUCTIONS
========================= */

router.get("/", async (req, res) => {
  try {
    await expireAuctions();

    const {
      search = "",
      category = "",
      status = "active",
      page,
      limit,
    } = req.query;

    const filter = {
      deleted: false,
      approved: true,
    };

    if (status !== "all") {
      filter.status = status;
    }

    if (category && category !== "All") {
      filter.categoryGroup = category;
    }

    const searchText = clean(search);

    if (searchText) {
      filter.$or = [
        {
          title: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          category: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          categoryGroup: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          description: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          seller: {
            $regex: searchText,
            $options: "i",
          },
        },
      ];
    }

    if (!page && !limit) {
      const auctions = await Auction.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return res.json(auctions);
    }

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const pageSize = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const [auctions, total] =
      await Promise.all([
        Auction.find(filter)
          .sort({ createdAt: -1 })
          .skip(
            (currentPage - 1) *
              pageSize
          )
          .limit(pageSize)
          .lean(),

        Auction.countDocuments(filter),
      ]);

    res.json({
      auctions,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        pages: Math.ceil(
          total / pageSize
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get auctions error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load auctions.",
    });
  }
});

/* =========================
   GET SINGLE AUCTION
========================= */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        message: "Invalid auction ID.",
      });
    }

    const auction =
      await Auction.findOneAndUpdate(
        {
          _id: id,
          deleted: false,
          approved: true,
        },
        {
          $inc: { views: 1 },
        },
        {
          new: true,
        }
      );

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found.",
      });
    }

    if (
      auction.status === "active" &&
      auction.endDate &&
      auction.endDate <= new Date()
    ) {
      auction.status = "ended";
      await auction.save();
    }

    res.json(auction);
  } catch (error) {
    console.error(
      "Get auction error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load auction.",
    });
  }
});

/* =========================
   CREATE AUCTION
========================= */

router.post("/", async (req, res) => {
  try {
    const {
      title,
      category,
      categoryGroup,
      description = "",
      image,
      startingPrice,
      price,
      seller = "AuctionBD User",
      sellerId = "",
      sellerEmail = "",
      sellerPhone = "",
      startDate,
      endDate,
      time = "Live",
    } = req.body;

    const cleanTitle = clean(title);
    const cleanCategory = clean(category);
    const cleanGroup = clean(categoryGroup);
    const cleanDescription =
      clean(description);
    const cleanImage = clean(image);

    if (
      !cleanTitle ||
      !cleanCategory ||
      !cleanGroup ||
      !cleanImage
    ) {
      return res.status(400).json({
        message:
          "Title, category, category group and image are required.",
      });
    }

    const starting = Number(
      startingPrice ?? price ?? 0
    );

    if (
      !Number.isFinite(starting) ||
      starting < 0
    ) {
      return res.status(400).json({
        message:
          "Invalid starting price.",
      });
    }

    const auction =
      await Auction.create({
        title: cleanTitle,
        category: cleanCategory,
        categoryGroup: cleanGroup,
        description: cleanDescription,
        image: cleanImage,

        startingPrice: starting,
        price: starting,

        seller:
          clean(seller) ||
          "AuctionBD User",

        sellerId: clean(sellerId),

        sellerEmail:
          email(sellerEmail),

        sellerPhone:
          clean(sellerPhone),

        startDate:
          startDate || new Date(),

        endDate:
          endDate || null,

        time:
          clean(time) || "Live",

        status: "active",
        approved: true,
        deleted: false,
      });

    res.status(201).json(auction);
  } catch (error) {
    console.error(
      "Create auction error:",
      error
    );

    res.status(400).json({
      message:
        error.message ||
        "Unable to create auction.",
    });
  }
});

/* =========================
   PLACE BID
   LOGIN REQUIRED
========================= */

router.post(
  "/:id/bids",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const amount = Number(
        req.body.amount
      );

      if (!validId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid bid amount.",
        });
      }

      const auction =
        await Auction.findOne({
          _id: id,
          deleted: false,
          approved: true,
        });

      if (!auction) {
        return res.status(404).json({
          message:
            "Auction not found.",
        });
      }

      const now = new Date();

      if (auction.status !== "active") {
        return res.status(400).json({
          message:
            `This auction is ${auction.status}.`,
        });
      }

      if (
        auction.startDate &&
        auction.startDate > now
      ) {
        return res.status(400).json({
          message:
            "This auction has not started yet.",
        });
      }

      if (
        auction.endDate &&
        auction.endDate <= now
      ) {
        auction.status = "ended";
        await auction.save();

        return res.status(400).json({
          message:
            "This auction has ended.",
        });
      }

      if (amount <= auction.price) {
        return res.status(400).json({
          message:
            `Bid must be higher than ৳${auction.price.toLocaleString(
              "en-BD"
            )}.`,
        });
      }

      /*
       * IMPORTANT:
       * Bidder information comes from
       * the authenticated JWT.
       *
       * We do NOT trust bidder information
       * sent by the frontend.
       */

      const bidder =
        clean(req.user.name);

      const bidderId =
        req.user._id.toString();

      const bidderEmail =
        email(req.user.email);

      /*
       * Atomic update prevents two users
       * from placing the same/lower bid
       * at the same time.
       */

      const updated =
        await Auction.findOneAndUpdate(
          {
            _id: id,
            status: "active",
            approved: true,
            deleted: false,
            price: {
              $lt: amount,
            },
          },
          {
            $set: {
              price: amount,
            },

            $push: {
              bidHistory: {
                $each: [
                  {
                    bidder,
                    amount,
                    createdAt: now,
                  },
                ],
                $position: 0,
              },
            },

            $inc: {
              bids: 1,
            },
          },
          {
            new: true,
          }
        );

      if (!updated) {
        return res.status(409).json({
          message:
            "Another bid was placed first. Please bid higher.",
        });
      }

      const savedBid =
        await Bid.create({
          auctionId: auction._id,
          bidder,
          bidderId,
          bidderEmail,
          amount,
          status: "valid",
        });

      res.status(201).json({
        message:
          "Bid placed successfully.",

        auction: updated,

        bid: {
          _id: savedBid._id,
          bidder:
            savedBid.bidder,
          bidderId:
            savedBid.bidderId,
          bidderEmail:
            savedBid.bidderEmail,
          amount:
            savedBid.amount,
          status:
            savedBid.status,
          createdAt:
            savedBid.createdAt,
        },
      });
    } catch (error) {
      console.error(
        "Place bid error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to place bid.",
      });
    }
  }
);

/* =========================
   GET BID HISTORY
========================= */

router.get(
  "/:id/bids",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!validId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      const auction =
        await Auction.findOne({
          _id: id,
          deleted: false,
        })
          .select(
            "bidHistory bids price"
          )
          .lean();

      if (!auction) {
        return res.status(404).json({
          message:
            "Auction not found.",
        });
      }

      const bids = await Bid.find({
        auctionId: id,
      })
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();

      res.json({
        bids: bids.length
          ? bids
          : auction.bidHistory || [],

        total:
          auction.bids || 0,

        currentPrice:
          auction.price,
      });
    } catch (error) {
      console.error(
        "Bid history error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load bid history.",
      });
    }
  }
);

export default router;