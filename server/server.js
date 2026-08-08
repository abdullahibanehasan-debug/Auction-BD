import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import auctionRoutes from "./routes/auctionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   SECURITY
========================= */

app.disable("x-powered-by");
app.set("trust proxy", 1);

/* =========================
   CORS
========================= */

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://auction-bd-frontend.onrender.com",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Admin-Key",
    ],
  })
);

/* =========================
   REQUEST BODY
========================= */

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/* =========================
   SECURITY HEADERS
========================= */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  next();
});

/* =========================
   UPLOADS
========================= */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   API ROOT
========================= */

app.get("/", (req, res) => {
  res.json({
    name: "AuctionBD API",
    version: "1.0.0",
    status: "running",
  });
});

/* =========================
   API ROUTES
========================= */

app.use("/api/auth", authRoutes);

app.use("/api/auctions", auctionRoutes);

app.use("/api/admin", adminRoutes);

/*
  IMPORTANT:
  Your frontend uses:

  /api/seller-requests
  /api/seller-requests/mine

  So the router MUST be mounted here.
*/
app.use("/api/seller-requests", sellerRoutes);

/*
  Keep the old route too so older frontend code
  doesn't suddenly break.
*/
app.use("/api/sellers", sellerRoutes);

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
    path: req.originalUrl,
  });
});

/* =========================
   ERROR HANDLER
========================= */

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(error.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : error.message || "Internal server error.",
  });
});

/* =========================
   DATABASE
========================= */

async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing from environment variables."
    );
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 2,
  });

  console.log("MongoDB connected successfully ✅");
}

/* =========================
   START SERVER
========================= */

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `AuctionBD API running on port ${PORT} 🚀`
      );

      console.log(
        `Local API: http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed ❌", error);
    process.exit(1);
  }
}

/* =========================
   GRACEFUL SHUTDOWN
========================= */

async function shutdown(signal) {
  console.log(`${signal}: shutting down...`);

  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("Error closing MongoDB:", error);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();