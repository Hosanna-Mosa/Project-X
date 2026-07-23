import * as dotenv from "dotenv";
import { connectDB } from "./src/database/db";
import Driver, { DriverStatus } from "./src/database/models/Driver";
import Zone from "./src/database/models/Zone";
import mongoose from "mongoose";

dotenv.config();

async function setDriverOnline() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    console.log("Finding and updating driver in Dowleswaram to ONLINE...");
    const drivers = await Driver.find({});
    
    // Manually find the driver that is close to Dowleswaram (coords [81.777, 16.961])
    const driver = drivers.find(d => {
      const coords = d.currentLocation?.coordinates;
      if (Array.isArray(coords) && coords.length === 2) {
        const lonDiff = Math.abs(coords[0] - 81.77748856668853);
        const latDiff = Math.abs(coords[1] - 16.961124806610698);
        return lonDiff < 0.01 && latDiff < 0.01;
      }
      return false;
    });

    if (driver) {
      driver.status = DriverStatus.ONLINE;
      driver.isAvailable = true;
      await driver.save();
      console.log(`\n✅ SUCCESS: Updated driver ${driver.user} to ONLINE and available.`);
    } else {
      console.log("❌ Driver not found near coords [81.777, 16.961].");
    }

    console.log("Finding and activating Dowleswaram zone...");
    const zone = await Zone.findOne({ name: /Dowleswaram/i });
    if (zone) {
      zone.isActive = true;
      await zone.save();
      console.log(`✅ SUCCESS: Activated zone ${zone.name}.`);
    } else {
      console.log("❌ Zone containing 'Dowleswaram' not found.");
    }

  } catch (error: any) {
    console.error("❌ Failed to set driver online:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

setDriverOnline();
