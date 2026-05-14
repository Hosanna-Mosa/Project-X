import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Vendor from "./models/Vendor";
import { connectDB } from "./db";

dotenv.config();

const MOCK_VENDORS = [
  {
    name: "McDonald's",
    phone: "9876543210",
    email: "mcd@example.com",
    googlePlaceId: "ChIJR3-K6mOTyzsR3S0vDqL4Mms",
    location: {
      type: "Point",
      coordinates: [78.3489, 17.4486] // Longitude, Latitude
    },
    address: "Hitech City Main Rd, Hyderabad",
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500",
    rating: 4.3,
    reviews: "652",
    categories: ["Burgers", "Beverages", "Cafe"],
    isPureVeg: false,
    deliveryFee: 40,
    minOrderValue: 200
  },
  {
    name: "Raju Tiffin Center",
    phone: "9876543211",
    email: "raju@example.com",
    location: {
      type: "Point",
      coordinates: [78.3500, 17.4440]
    },
    address: "Kothaguda, Hyderabad",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500",
    rating: 4.8,
    reviews: "646",
    categories: ["South Indian"],
    isPureVeg: true,
    deliveryFee: 20,
    minOrderValue: 100
  },
  {
    name: "The Dessert Heaven",
    phone: "9876543212",
    email: "dessert@example.com",
    location: {
      type: "Point",
      coordinates: [78.3450, 17.4500]
    },
    address: "Kondapur, Hyderabad",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500",
    rating: 4.5,
    reviews: "1.7K+",
    categories: ["Bakery", "Desserts"],
    isPureVeg: true,
    deliveryFee: 30,
    minOrderValue: 150
  }
];

const seedVendors = async () => {
  try {
    await connectDB();
    console.log("Connected to database...");

    // Clear existing vendors
    await Vendor.deleteMany({});
    console.log("Cleared existing vendors.");

    // Insert mock vendors
    await Vendor.insertMany(MOCK_VENDORS);
    console.log("Successfully seeded vendors!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding vendors:", error);
    process.exit(1);
  }
};

seedVendors();
