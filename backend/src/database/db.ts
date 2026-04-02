import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not defined in .env");
  // Don't exit here if we're in development or if we want to handle it in index.ts
}

export const connectDB = async () => {
  try {
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined in .env");
    }
    await mongoose.connect(DATABASE_URL);
    console.log("MongoDB connection established");
  } catch (error: any) {
    if (error.code === "ENOTFOUND") {
      console.error("❌ MongoDB Host not found. Please double check your 'DATABASE_URL' in .env (especially the cluster name).");
    } else {
      console.error("❌ MongoDB connection failed:", error.message);
    }
    process.exit(1);
  }
};
