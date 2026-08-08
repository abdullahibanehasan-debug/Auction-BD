import dns from "dns";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import auctionRoutes from "./routes/auctionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;


// ========================================
// MIDDLEWARE
// ========================================

app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());


// ========================================
// API ROUTES
// ========================================

// Public auction API
app.use(
  "/api/auctions",
  auctionRoutes
);

// Protected admin API
app.use(
  "/api/admin",
  adminRoutes
);


// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "AuctionBD API is running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});


// ========================================
// ROOT ROUTE
// ========================================

app.get("/", (req, res) => {
  res.json({
    name: "AuctionBD API",
    version: "1.0.0",
    status: "running",
  });
});


// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});


// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(
    error.status || 500
  ).json({
    message:
      error.message ||
      "Internal server error",
  });
});


// ========================================
// MONGODB CONNECTION
// ========================================

async function connectDatabase() {
  try {
    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 10000,
      }
    );

    console.log(
      "MongoDB connected successfully ✅"
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed ❌"
    );

    console.error(error);

    process.exit(1);
  }
}


// ========================================
// START SERVER
// ========================================

async function startServer() {
  await connectDatabase();

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `AuctionBD API running on port ${PORT}`
      );
    }
  );
}

startServer();