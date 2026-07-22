import mongoose from "mongoose";
import * as dotenv from "dotenv";
import User from "./src/database/models/User";

dotenv.config();
const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function checkAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Database connected:", mongoose.connection.name);
    const admins = await User.find({ role: "ADMIN" });
    console.log("Admin Users in database:");
    admins.forEach(admin => {
      console.log({
        id: admin._id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        role: admin.role,
        hasPassword: !!admin.password,
        passwordPreview: admin.password ? admin.password.substring(0, 10) + "..." : "none"
      });
    });
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAdmin();
