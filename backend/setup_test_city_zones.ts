import * as dotenv from "dotenv";
import { connectDB } from "./src/database/db";
import Zone, { ZoneType } from "./src/database/models/Zone";
import Driver from "./src/database/models/Driver";
import User from "./src/database/models/User";
import mongoose from "mongoose";

dotenv.config();

async function setupTestCityZones() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    // 1. Deactivate all existing micro-zones to isolate our test
    console.log("Deactivating all existing micro-zones...");
    await Zone.updateMany({}, { $set: { isActive: false } });

    // 2. Delete any old test zones if present
    await Zone.deleteMany({ name: { $in: ["Full Rajahmundry", "Full Kakinada"] } });

    const allServices = ["bike", "auto", "cab", "cab_prime", "delivery", "helper"];

    // 3. Create "Full Rajahmundry" Zone
    const rajahmundryZone = await Zone.create({
      name: "Full Rajahmundry",
      type: ZoneType.CIRCLE,
      pricingMultiplier: 1.0,
      isActive: true,
      center: {
        type: "Point",
        coordinates: [81.7777, 16.9962], // [lng, lat]
      },
      radius: 25000, // 25 km radius
      description: "Citywide zone covering all of Rajahmundry",
      allowedServices: allServices,
    });

    // 4. Create "Full Kakinada" Zone
    const kakinadaZone = await Zone.create({
      name: "Full Kakinada",
      type: ZoneType.CIRCLE,
      pricingMultiplier: 1.0,
      isActive: true,
      center: {
        type: "Point",
        coordinates: [82.2350, 16.9890], // [lng, lat]
      },
      radius: 25000, // 25 km radius
      description: "Citywide zone covering all of Kakinada",
      allowedServices: allServices,
    });

    console.log("\n============================================================");
    console.log("✅ CITY ZONES CREATED SUCCESSFULLY:");
    console.log(` 📍 Zone 1: "${rajahmundryZone.name}" | ID: ${rajahmundryZone._id} | Center: [81.7777, 16.9962] | Radius: 25km`);
    console.log(` 📍 Zone 2: "${kakinadaZone.name}"    | ID: ${kakinadaZone._id} | Center: [82.2350, 16.9890] | Radius: 25km`);
    console.log("============================================================\n");

    // 5. Find driver Mahi and assign to Full Kakinada zone & coordinates
    const mahiUser = await User.findOne({ name: /Mahi/i });
    if (mahiUser) {
      const mahiDriver = await Driver.findOne({ user: mahiUser._id });
      if (mahiDriver) {
        mahiDriver.preferredZone = kakinadaZone._id;
        mahiDriver.currentLocation = {
          type: "Point",
          coordinates: [82.2350, 16.9890], // Kakinada Center coordinates
        };
        await mahiDriver.save();
        console.log(`🚗 ASSIGNED DRIVER "Mahi" (${mahiUser.phone}) to Zone: "${kakinadaZone.name}" (${kakinadaZone._id}) with Kakinada Coordinates [82.2350, 16.9890]`);
      }
    } else {
      console.log("ℹ️ User 'Mahi' not found in database for auto-assignment.");
    }

  } catch (error: any) {
    console.error("❌ Error setting up test city zones:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

setupTestCityZones();
