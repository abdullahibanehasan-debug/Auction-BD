import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import auctionRoutes from "./routes/auctionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   SERVER
========================================================= */

app.disable("x-powered-by");
app.set("trust proxy", 1);

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://auction-bd-frontend.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("CORS blocked:", origin);
      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

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
      "X-Admin-Key",
    ],

    optionsSuccessStatus: 204,
  })
);

/* =========================================================
   BODY PARSING
========================================================= */

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

/* =========================================================
   SECURITY HEADERS
========================================================= */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  next();
});

/* =========================================================
   REQUEST LOGGING
========================================================= */

app.use((req, res, next) => {
  const started = Date.now();

  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`
    );
  });

  next();
});

/* =========================================================
   STATIC UPLOADS
========================================================= */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    name: "AuctionBD API",
    status: "running",
    health: "/api/health",
    api: "/api",
  });
});

/* =========================================================
   API ROOT
========================================================= */

app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    name: "AuctionBD API",
    version: "1.0.0",
    status: "running",

    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",

    routes: {
      health: "/api/health",
      auth: "/api/auth",
      auctions: "/api/auctions",
      admin: "/api/admin",
      sellers: "/api/seller-requests",
    },
  });
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    server: "AuctionBD API",

    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",

    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   API ROUTES
========================================================= */

app.use("/api/auth", authRoutes);

app.use("/api/auctions", auctionRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/seller-requests", sellerRoutes);

/* Backward compatibility */
app.use("/api/sellers", sellerRoutes);

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  console.warn(`404: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
    method: req.method,
    path: req.originalUrl,
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : error.message || "Internal server error.",
  });
});

/* =========================================================
   DATABASE
========================================================= */

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is missing from environment variables."
    );
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    family: 4,
  });

  console.log("MongoDB connected successfully ✅");
}

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("========================================");
      console.log("🔥 AUCTIONBD SERVER STARTED 🔥");
      console.log(`Port: ${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log(
        `Health: http://localhost:${PORT}/api/health`
      );
      console.log(`API: http://localhost:${PORT}/api`);
      console.log("========================================");
    });
  } catch (error) {
    console.error("SERVER STARTUP FAILED ❌");
    console.error(error);
    process.exit(1);
  }
}

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

async function shutdown(signal) {
  console.log(`${signal}: shutting down...`);

  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("MongoDB shutdown error:", error);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/* =========================================================
   START
========================================================= */

startServer();