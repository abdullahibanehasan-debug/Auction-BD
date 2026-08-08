import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    categoryGroup: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    bids: {
      type: Number,
      default: 0,
    },

    time: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    seller: {
      type: String,
      default: "AuctionBD User",
    },

    bidHistory: [
      {
        bidder: {
          type: String,
          required: true,
        },

        amount: {
          type: Number,
          required: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Auction", auctionSchema);