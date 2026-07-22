import mongoose from "mongoose";
import * as dotenv from "dotenv";
import User, { UserRole } from "../database/models/User";

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function seedSupport() {
  try {
    console.log("Connecting to:", MONGO_URI.split("@").pop());
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Database:", mongoose.connection.name);

    const supportPhone = "8888888888";
    const existingSupport = await User.findOne({ phone: supportPhone });

    if (existingSupport) {
      console.log("Support agent already exists with phone:", supportPhone);
      // Ensure role is SUPPORT and password is correct even if it exists
      existingSupport.role = UserRole.SUPPORT;
      existingSupport.password = "support123";
      await existingSupport.save();
      console.log("Existing support agent credentials verified and updated.");
      process.exit(0);
    }

    const supportAgent = new User({
      name: "Support Agent",
      phone: supportPhone,
      email: "support@precisionnav.com",
      role: UserRole.SUPPORT,
      password: "support123"
    });

    await supportAgent.save();
    console.log("Support agent user created successfully!");
    console.log("Phone: 8888888888");
    console.log("Password: support123");
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding support agent:", error);
    process.exit(1);
  }
}

seedSupport();
