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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Auction",
  auctionSchema
);