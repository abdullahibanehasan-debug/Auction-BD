import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    bidder: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const auctionSchema = new mongoose.Schema(
  {
    // PRODUCT
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    categoryGroup: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    image: {
      type: String,
      required: true,
      trim: true,
    },

    // PRICING
    startingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    soldPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    commissionRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },

    // BIDDING
    bids: {
      type: Number,
      default: 0,
      min: 0,
    },

    bidHistory: {
      type: [bidSchema],
      default: [],
    },

    // SELLER
    seller: {
      type: String,
      default: "AuctionBD User",
      trim: true,
      maxlength: 120,
    },

    sellerId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    sellerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    sellerPhone: {
      type: String,
      default: "",
      trim: true,
    },

    // STATUS
    status: {
      type: String,
      enum: [
        "active",
        "pending",
        "sold",
        "ended",
        "cancelled",
      ],
      default: "active",
      index: true,
    },

    approved: {
      type: Boolean,
      default: true,
      index: true,
    },

    // TIMING
    time: {
      type: String,
      default: "Live",
      trim: true,
    },

    startDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    endDate: {
      type: Date,
      default: null,
      index: true,
    },

    soldAt: {
      type: Date,
      default: null,
    },

    // ANALYTICS
    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    // FUTURE WINNER / ORDER SYSTEM
    winnerId: {
      type: String,
      default: "",
      trim: true,
    },

    winnerName: {
      type: String,
      default: "",
      trim: true,
    },

    winnerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    orderId: {
      type: String,
      default: "",
      trim: true,
    },

    // SOFT DELETE
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual commission
auctionSchema.virtual("commissionAmount").get(function () {
  const salePrice =
    this.soldPrice || this.price || 0;

  return salePrice * (this.commissionRate / 100);
});

// Virtual expiration
auctionSchema.virtual("isExpired").get(function () {
  return Boolean(
    this.endDate && this.endDate <= new Date()
  );
});

auctionSchema.set("toJSON", {
  virtuals: true,
});

auctionSchema.set("toObject", {
  virtuals: true,
});

// Performance indexes
auctionSchema.index({
  status: 1,
  approved: 1,
  deleted: 1,
  createdAt: -1,
});

auctionSchema.index({
  categoryGroup: 1,
  status: 1,
});

auctionSchema.index({
  sellerId: 1,
  createdAt: -1,
});

auctionSchema.index({
  title: "text",
  description: "text",
});

export default mongoose.model(
  "Auction",
  auctionSchema
);