import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },

    filename: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    size: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const sellerRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sellerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    sellerPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

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

    condition: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    expectedPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },

    images: {
      type: [mediaSchema],
      default: [],
    },

    videos: {
      type: [mediaSchema],
      default: [],
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "more_info",
      ],
      default: "pending",
      index: true,
    },

    adminNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: String,
      default: "",
    },

    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

sellerRequestSchema.index({
  userId: 1,
  createdAt: -1,
});

sellerRequestSchema.index({
  status: 1,
  createdAt: -1,
});

export default mongoose.model(
  "SellerRequest",
  sellerRequestSchema
);