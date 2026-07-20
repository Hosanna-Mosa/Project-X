import * as dotenv from "dotenv";
import { connectDB } from "./src/database/db";
import Driver, { DriverStatus } from "./src/database/models/Driver";
import mongoose from "mongoose";

dotenv.config();

async function setAllDriversOffline() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    console.log("Updating all drivers status to OFFLINE...");
    const result = await Driver.updateMany(
      {},
      {
        $set: {
          status: DriverStatus.OFFLINE,
          isAvailable: false,
        },
      }
    );

    console.log(`\n✅ SUCCESS: Updated ${result.modifiedCount} drivers to OFFLINE status (isAvailable: false).`);

    const onlineCount = await Driver.countDocuments({ status: DriverStatus.ONLINE });
    console.log(`📊 Current ONLINE drivers in database: ${onlineCount}`);

  } catch (error: any) {
    console.error("❌ Failed to set drivers offline:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

setAllDriversOffline();
