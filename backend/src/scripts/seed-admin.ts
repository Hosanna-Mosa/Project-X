import mongoose from "mongoose";
import * as dotenv from "dotenv";
import User, { UserRole } from "../database/models/User";

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function seedAdmin() {
  try {
    console.log("Connecting to:", MONGO_URI.split("@").pop()); // Log only the host part for security
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Database:", mongoose.connection.name);

    const adminPhone = "9999999999";
    const existingAdmin = await User.findOne({ phone: adminPhone });

    if (existingAdmin) {
      console.log("Admin already exists in this database with phone:", adminPhone);
      // Ensure role is ADMIN and password is correct even if it exists
      existingAdmin.role = UserRole.ADMIN;
      existingAdmin.password = "admin123";
      await existingAdmin.save();
      console.log("Existing admin credentials verified and updated.");
      process.exit(0);
    }

    const admin = new User({
      name: "System Admin",
      phone: adminPhone,
      email: "admin@precisionnav.com",
      role: UserRole.ADMIN,
      password: "admin123"
    });

    await admin.save();
    console.log("Admin user created successfully!");
    console.log("Phone: 9999999999");
    console.log("Password: admin123");
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
}


seedAdmin();
