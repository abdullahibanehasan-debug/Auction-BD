import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },

    bidder: {
      type: String,
      default: "Guest Bidder",
      trim: true,
      maxlength: 120,
    },

    bidderId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    bidderEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "valid",
        "winning",
        "outbid",
        "cancelled",
      ],
      default: "valid",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast auction bid queries
bidSchema.index({
  auctionId: 1,
  amount: -1,
});

bidSchema.index({
  auctionId: 1,
  createdAt: -1,
});

// Fast bidder history
bidSchema.index({
  bidderId: 1,
  createdAt: -1,
});

export default mongoose.model("Bid", bidSchema);