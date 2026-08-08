import dns from "dns";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);
import mongoose from "mongoose";
import dotenv from "dotenv";
import Auction from "./models/Auction.js";

dotenv.config();

const auctions = [
  {
    title: "iPhone 15 Pro",
    category: "Smartphones",
    categoryGroup: "Electronics",
    price: 62500,
    bids: 18,
    time: "02h 14m",
    image: "https://images.unsplash.com/photo-1696446701796-da61225697cc",
    description: "Latest iPhone with premium features",
    seller: "AuctionBD User"
  },
  {
    title: "Gaming Laptop",
    category: "Laptops",
    categoryGroup: "Electronics",
    price: 85000,
    bids: 12,
    time: "05h 30m",
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302",
    description: "High performance gaming laptop",
    seller: "AuctionBD User"
  }
];


const seedDB = async () => {
  try {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected ✅");


    await Auction.deleteMany();

    await Auction.insertMany(auctions);


    console.log("Auctions inserted successfully 🚀");

    process.exit();

  } catch (error) {

    console.log(error);
    process.exit(1);

  }
};


seedDB();