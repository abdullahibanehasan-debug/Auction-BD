import dns from "dns";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import auctionRoutes from "./routes/auctionRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


// Auction routes
app.use("/api/auctions", auctionRoutes);


console.log("Connecting to MongoDB...");

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("MongoDB connected successfully ✅");
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌");
    console.error(error);
  });


app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AuctionBD API is running",
  });
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `AuctionBD API running on port ${PORT}`
  );
});