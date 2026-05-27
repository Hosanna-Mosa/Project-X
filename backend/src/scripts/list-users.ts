import mongoose from "mongoose";
import * as dotenv from "dotenv";
import User from "../database/models/User";

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function listUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Database:", mongoose.connection.name);

    const users = await User.find({}, "name phone role addresses");
    console.log("Total Users found:", users.length);
    users.forEach(u => {
      console.log(`\n- Name: ${u.name}, Phone: ${u.phone}`);
      if (u.addresses && u.addresses.length > 0) {
        u.addresses.forEach((addr: any) => {
          console.log(`  * Label: ${addr.label}, Address: ${addr.addressLine}, Coords: ${JSON.stringify(addr.location?.coordinates)}`);
        });
      } else {
        console.log("  * No addresses saved.");
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error listing users:", error);
    process.exit(1);
  }
}

listUsers();
