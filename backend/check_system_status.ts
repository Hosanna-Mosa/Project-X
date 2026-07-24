import * as dotenv from "dotenv";
import { connectDB } from "./src/database/db";
import { DriverService } from "./src/modules/drivers/drivers.service";
import mongoose from "mongoose";

dotenv.config();

async function testDriverMatching() {
  try {
    await connectDB();
    console.log("--- TESTING DRIVER MATCHING ---");

    const driverService = new DriverService();

    // Coordinates of typical driver: lat 17.0005, lng 81.7831
    const testCases = [
      { lat: 17.0005, lng: 81.7831, type: "bike" },
      { lat: 17.0005, lng: 81.7831, type: "auto" },
      { lat: 17.0005, lng: 81.7831, type: "cab" },
      { lat: 17.0005, lng: 81.7831, type: "delivery" },
      { lat: 17.0005, lng: 81.7831, type: "helper" },
      // Coordinates of user in different location, e.g. 16.9327032, 81.7528132
      { lat: 16.9327032, lng: 81.7528132, type: "bike" },
      { lat: 16.98, lng: 81.78, type: "bike" },
      // Faraway coordinates
      { lat: 12.9716, lng: 77.5946, type: "bike" }, // Bangalore
    ];

    for (const tc of testCases) {
      console.log(`\nTesting search at lat: ${tc.lat}, lng: ${tc.lng}, type: ${tc.type}`);
      const drivers = await driverService.getNearbyDrivers(tc.lat, tc.lng, undefined, tc.type, true);
      console.log(`RESULT: Found ${drivers.length} drivers for ${tc.type} at [${tc.lat}, ${tc.lng}]`);
    }

  } catch (err: any) {
    console.error("Error testing driver matching:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testDriverMatching();
