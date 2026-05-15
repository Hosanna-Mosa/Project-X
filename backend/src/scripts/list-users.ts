import mongoose from "mongoose";
import * as dotenv from "dotenv";
import User from "../database/models/User";

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function listUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Database:", mongoose.connection.name);

    const users = await User.find({}, "name phone role password");
    console.log("Total Users found:", users.length);
    users.forEach(u => {
      console.log(`- Name: ${u.name}, Phone: ${u.phone}, Role: ${u.role}, Password: ${u.password}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error listing users:", error);
    process.exit(1);
  }
}

listUsers();
