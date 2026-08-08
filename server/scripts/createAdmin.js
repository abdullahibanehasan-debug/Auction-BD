import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const {
  MONGODB_URI,
  ADMIN_NAME,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} = process.env;

async function createAdmin() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD are required in .env"
      );
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const email = ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role === "admin") {
        console.log("Admin already exists.");
        return;
      }

      existing.role = "admin";
      existing.active = true;
      existing.verified = true;

      if (ADMIN_NAME) {
        existing.name = ADMIN_NAME;
      }

      existing.password = await bcrypt.hash(
        ADMIN_PASSWORD,
        12
      );

      await existing.save();

      console.log(`Existing user promoted to admin: ${email}`);
      return;
    }

    const password = await bcrypt.hash(
      ADMIN_PASSWORD,
      12
    );

    const admin = await User.create({
      name: ADMIN_NAME || "AuctionBD Admin",
      email,
      password,
      role: "admin",
      active: true,
      verified: true,
    });

    console.log("\n================================");
    console.log("        ADMIN CREATED");
    console.log("================================");
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}`);
    console.log("================================\n");
  } catch (error) {
    console.error("\nAdmin creation failed:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();