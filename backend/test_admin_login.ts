import mongoose from "mongoose";
import * as dotenv from "dotenv";
import User from "./src/database/models/User";

dotenv.config();
const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function testMatch() {
  try {
    await mongoose.connect(MONGO_URI);
    const user = await User.findOne({ phone: "9999999999" });
    if (!user) {
      console.log("User not found!");
      process.exit(1);
    }
    const isMatch = await user.matchPassword("admin123");
    console.log("Password match for 'admin123':", isMatch);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testMatch();
