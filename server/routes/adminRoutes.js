import express from "express";
import mongoose from "mongoose";

import Auction from "../models/Auction.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    name: "AuctionBD Admin API",
    status: "running",
    endpoints: {
      stats: "/api/admin/stats",
      auctions: "/api/admin/auctions",
    },
  });
});

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

/*
 * Optional admin protection.
 *
 * If ADMIN_KEY exists in .env,
 * requests must send:
 *
 * X-Admin-Key: your-key
 *
 * Keeping it optional right now means
 * your existing AdminPanel continues working.
 */
function adminProtection(req, res, next) {
  const configuredKey =
    process.env.ADMIN_KEY;

  if (!configuredKey) {
    return next();
  }

  const providedKey =
    req.headers["x-admin-key"];

  if (
    !providedKey ||
    providedKey !== configuredKey
  ) {
    return res.status(401).json({
      message:
        "Admin authorization required.",
    });
  }

  next();
}

router.use(adminProtection);

// Automatically end expired auctions.
async function expireAuctions() {
  await Auction.updateMany(
    {
      status: "active",
      endDate: {
        $ne: null,
        $lte: new Date(),
      },
      deleted: false,
    },
    {
      $set: {
        status: "ended",
      },
    }
  );
}

// DASHBOARD STATS
router.get("/stats", async (req, res) => {
  try {
    await expireAuctions();

    const now = new Date();

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const [
      totalAuctions,
      activeAuctions,
      soldAuctions,
      endedAuctions,
      pendingAuctions,
      cancelledAuctions,
      bidStats,
      salesStats,
      monthlyStats,
      viewsStats,
      recentAuctions,
    ] = await Promise.all([
      Auction.countDocuments({
        deleted: false,
      }),

      Auction.countDocuments({
        status: "active",
        deleted: false,
      }),

      Auction.countDocuments({
        status: "sold",
        deleted: false,
      }),

      Auction.countDocuments({
        status: "ended",
        deleted: false,
      }),

      Auction.countDocuments({
        status: "pending",
        deleted: false,
      }),

      Auction.countDocuments({
        status: "cancelled",
        deleted: false,
      }),

      Auction.aggregate([
        {
          $match: {
            deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$bids",
            },
          },
        },
      ]),

      Auction.aggregate([
        {
          $match: {
            status: "sold",
            deleted: false,
          },
        },
        {
          $group: {
            _id: null,

            sales: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      "$soldPrice",
                      0,
                    ],
                  },
                  "$soldPrice",
                  "$price",
                ],
              },
            },

            commission: {
              $sum: {
                $multiply: [
                  {
                    $cond: [
                      {
                        $gt: [
                          "$soldPrice",
                          0,
                        ],
                      },
                      "$soldPrice",
                      "$price",
                    ],
                  },
                  {
                    $divide: [
                      "$commissionRate",
                      100,
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),

      Auction.aggregate([
        {
          $match: {
            status: "sold",
            soldAt: {
              $gte: monthStart,
            },
            deleted: false,
          },
        },
        {
          $group: {
            _id: null,

            sales: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      "$soldPrice",
                      0,
                    ],
                  },
                  "$soldPrice",
                  "$price",
                ],
              },
            },
          },
        },
      ]),

      Auction.aggregate([
        {
          $match: {
            deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$views",
            },
          },
        },
      ]),

      Auction.find({
        deleted: false,
      })
        .sort({
          createdAt: -1,
        })
        .limit(10),
    ]);

    const totalSales =
      salesStats[0]?.sales || 0;

    const totalCommission =
      salesStats[0]?.commission || 0;

    const monthlySales =
      monthlyStats[0]?.sales || 0;

    res.json({
      totalAuctions,
      activeAuctions,
      soldAuctions,
      endedAuctions,
      pendingAuctions,
      cancelledAuctions,

      totalBids:
        bidStats[0]?.total || 0,

      totalViews:
        viewsStats[0]?.total || 0,

      totalSales,
      totalCommission,

      monthlySales,

      monthlyCommission:
        monthlySales * 0.05,

      commissionRate: 5,

      recentAuctions,
    });
  } catch (error) {
    console.error(
      "Admin stats error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load admin statistics.",
    });
  }
});

// GET ADMIN AUCTIONS
router.get(
  "/auctions",
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        search,
      } = req.query;

      const filter = {
        deleted: false,
      };

      if (
        status &&
        status !== "all"
      ) {
        filter.status = status;
      }

      if (search?.trim()) {
        filter.$text = {
          $search: search.trim(),
        };
      }

      const currentPage = Math.max(
        Number(page) || 1,
        1
      );

      const pageSize = Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        100
      );

      const [
        auctions,
        total,
      ] = await Promise.all([
        Auction.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(
            (currentPage - 1) *
              pageSize
          )
          .limit(pageSize),

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
        "Admin auction list error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load auctions.",
      });
    }
  }
);

// CREATE AUCTION
router.post(
  "/auctions",
  async (req, res) => {
    try {
      const {
        title,
        category,
        categoryGroup,
        description = "",
        image,
        price,
        startingPrice,
        seller,
        sellerId,
        sellerEmail,
        sellerPhone,
        time = "Live",
        startDate,
        endDate,
        status = "active",
      } = req.body;

      if (
        !title ||
        !category ||
        !categoryGroup ||
        !image
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
          title,
          category,
          categoryGroup,
          description,
          image,

          startingPrice: starting,
          price: starting,

          seller,
          sellerId,
          sellerEmail,
          sellerPhone,

          time,

          startDate:
            startDate || new Date(),

          endDate:
            endDate || null,

          status,
          approved: true,
        });

      res.status(201).json(auction);
    } catch (error) {
      console.error(
        "Create auction error:",
        error
      );

      res.status(400).json({
        message: error.message,
      });
    }
  }
);

// UPDATE AUCTION
router.put(
  "/auctions/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      const allowedFields = [
        "title",
        "category",
        "categoryGroup",
        "description",
        "image",
        "startingPrice",
        "time",
        "startDate",
        "endDate",
        "seller",
        "sellerId",
        "sellerEmail",
        "sellerPhone",
        "commissionRate",
        "status",
        "approved",
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (
          req.body[field] !==
          undefined
        ) {
          updates[field] =
            req.body[field];
        }
      }

      const auction =
        await Auction.findOneAndUpdate(
          {
            _id: id,
            deleted: false,
          },
          updates,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!auction) {
        return res.status(404).json({
          message:
            "Auction not found.",
        });
      }

      res.json(auction);
    } catch (error) {
      console.error(
        "Update auction error:",
        error
      );

      res.status(400).json({
        message: error.message,
      });
    }
  }
);

// SOFT DELETE
router.delete(
  "/auctions/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      const auction =
        await Auction.findOneAndUpdate(
          {
            _id: id,
            deleted: false,
          },
          {
            deleted: true,
            status: "cancelled",
          },
          {
            new: true,
          }
        );

      if (!auction) {
        return res.status(404).json({
          message:
            "Auction not found.",
        });
      }

      res.json({
        message:
          "Auction archived successfully.",
        auction,
      });
    } catch (error) {
      console.error(
        "Delete auction error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to archive auction.",
      });
    }
  }
);

// APPROVE
router.patch(
  "/auctions/:id/approve",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      const auction =
        await Auction.findOneAndUpdate(
          {
            _id: id,
            deleted: false,
          },
          {
            approved: true,
            status: "active",
          },
          {
            new: true,
          }
        );

      if (!auction) {
        return res.status(404).json({
          message:
            "Auction not found.",
        });
      }

      res.json(auction);
    } catch (error) {
      console.error(
        "Approve auction error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to approve auction.",
      });
    }
  }
);

// MARK SOLD
router.patch(
  "/auctions/:id/sold",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      const auction =
        await Auction.findOne({
          _id: id,
          deleted: false,
        });

      if (!auction) {
        return res.status(404).json({
          message:
            "Auction not found.",
        });
      }

      const soldPrice = Number(
        req.body.soldPrice ??
          auction.price
      );

      if (
        !Number.isFinite(
          soldPrice
        ) ||
        soldPrice < 0
      ) {
        return res.status(400).json({
          message:
            "Invalid sold price.",
        });
      }

      auction.soldPrice =
        soldPrice;

      auction.price =
        soldPrice;

      auction.status =
        "sold";

      auction.soldAt =
        new Date();

      const highestBid = [
        ...(auction.bidHistory || []),
      ].sort(
        (a, b) =>
          b.amount - a.amount
      )[0];

      if (highestBid) {
        auction.winnerName =
          highestBid.bidder;
      }

      await auction.save();

      res.json(auction);
    } catch (error) {
      console.error(
        "Mark sold error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to mark auction as sold.",
      });
    }
  }
);

// END
router.patch(
  "/auctions/:id/end",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      const auction =
        await Auction.findOneAndUpdate(
          {
            _id: id,
            deleted: false,
            status: "active",
          },
          {
            status: "ended",
          },
          {
            new: true,
          }
        );

      if (!auction) {
        return res.status(404).json({
          message:
            "Active auction not found.",
        });
      }

      res.json(auction);
    } catch (error) {
      console.error(
        "End auction error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to end auction.",
      });
    }
  }
);

// CANCEL
router.patch(
  "/auctions/:id/cancel",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "Invalid auction ID.",
        });
      }

      const auction =
        await Auction.findOneAndUpdate(
          {
            _id: id,
            deleted: false,
            status: {
              $in: [
                "active",
                "pending",
              ],
            },
          },
          {
            status: "cancelled",
          },
          {
            new: true,
          }
        );

      if (!auction) {
        return res.status(404).json({
          message:
            "Auction not found.",
        });
      }

      res.json(auction);
    } catch (error) {
      console.error(
        "Cancel auction error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to cancel auction.",
      });
    }
  }
);

export default router;