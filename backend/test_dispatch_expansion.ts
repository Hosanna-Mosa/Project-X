import * as dotenv from "dotenv";
import { connectDB } from "./src/database/db";
import { DriverService } from "./src/modules/drivers/drivers.service";
import Driver, { DriverStatus } from "./src/database/models/Driver";
import Zone from "./src/database/models/Zone";
import User from "./src/database/models/User";
import mongoose from "mongoose";

dotenv.config();

async function testDispatchExpansion() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    const driverService = new DriverService();
    const rajahmundryZone = await Zone.findOne({ name: "Full Rajahmundry" });
    const kakinadaZone = await Zone.findOne({ name: "Full Kakinada" });

    if (!rajahmundryZone || !kakinadaZone) {
      console.error("Test city zones not found.");
      return;
    }

    const mahiUser = await User.findOne({ name: /Mahi/i });
    if (!mahiUser) {
      console.error("User Mahi not found.");
      return;
    }
    const mahiDriver = await Driver.findOne({ user: mahiUser._id });
    if (!mahiDriver) {
      console.error("Driver Mahi profile not found.");
      return;
    }

    // Set Mahi online & bike vehicle type
    mahiDriver.status = DriverStatus.ONLINE;
    mahiDriver.isAvailable = true;
    mahiDriver.vehicleType = "bike";

    // TEST CASE 1: Cross-City Isolation
    console.log("\n============================================================");
    console.log("🧪 TEST 1: Cross-City Isolation Test (Mahi in Kakinada vs Rajahmundry Pickup)");
    mahiDriver.preferredZone = kakinadaZone._id;
    mahiDriver.currentLocation = { type: "Point", coordinates: [82.2350, 16.9890] };
    await mahiDriver.save();

    const test1Results = await driverService.getNearbyDrivers(16.9962, 81.7777, undefined, "bike");
    console.log(`📊 TEST 1 RESULT: Matched ${test1Results.length} drivers for Rajahmundry pickup when Mahi is in Kakinada.`);
    if (test1Results.length === 0) {
      console.log("✅ TEST 1 PASSED: Cross-city isolation working perfectly! Kakinada driver excluded.");
    } else {
      console.error("❌ TEST 1 FAILED: Kakinada driver was matched for Rajahmundry pickup!");
    }

    // TEST CASE 2: Same City Stage 1 Matching (Mahi 2km from pickup in Rajahmundry)
    console.log("\n============================================================");
    console.log("🧪 TEST 2: Stage 1 Inner Ring Matching (Mahi 2 km from Rajahmundry pickup)");
    mahiDriver.preferredZone = rajahmundryZone._id;
    mahiDriver.currentLocation = { type: "Point", coordinates: [81.7777, 16.9800] }; // ~1.8 km
    await mahiDriver.save();

    const test2Results = await driverService.getNearbyDrivers(16.9962, 81.7777, undefined, "bike");
    console.log(`📊 TEST 2 RESULT: Matched ${test2Results.length} driver(s) in Stage 1!`);
    if (test2Results.length > 0 && test2Results.some((d: any) => d._id.toString() === mahiDriver._id.toString())) {
      console.log("✅ TEST 2 PASSED: Mahi matched in Stage 1 (Inner Ring 3km)!");
    } else {
      console.error("❌ TEST 2 FAILED: Mahi not matched in Stage 1!");
    }

    // TEST CASE 3: Dynamic Stage 2 Expansion (Mahi 5km from pickup in Rajahmundry)
    console.log("\n============================================================");
    console.log("🧪 TEST 3: Stage 2 Dynamic Expansion (Mahi 5 km from Rajahmundry pickup)");
    mahiDriver.preferredZone = rajahmundryZone._id;
    mahiDriver.currentLocation = { type: "Point", coordinates: [81.7777, 16.9500] }; // ~5.1 km
    await mahiDriver.save();

    const test3Results = await driverService.getNearbyDrivers(16.9962, 81.7777, undefined, "bike");
    console.log(`📊 TEST 3 RESULT: Matched ${test3Results.length} driver(s) in Stage 2 expansion!`);
    if (test3Results.length > 0 && test3Results.some((d: any) => d._id.toString() === mahiDriver._id.toString())) {
      console.log("✅ TEST 3 PASSED: Stage 1 expanded to Stage 2 (6km) and matched Mahi!");
    } else {
      console.error("❌ TEST 3 FAILED: Stage 2 expansion failed to match Mahi!");
    }

  } catch (error: any) {
    console.error("❌ Test error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

testDispatchExpansion();
