import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Driver, { DriverStatus } from "../database/models/Driver";
import Zone from "../database/models/Zone";
import Vendor from "../database/models/Vendor";
import { DriverService } from "../modules/drivers/drivers.service";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function runCheck() {
  console.log("==================================================");
  console.log("🔍 STARTING LOCATION DATA INSPECTOR SCRIPT");
  console.log("==================================================");
  console.log(`Connecting to MongoDB at: ${DATABASE_URL}...`);
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("✅ Connected successfully to MongoDB.");

    // 1. Check Zones
    console.log("\n--- 🗺️  ZONES REGISTERED IN DATABASE ---");
    const zones = await Zone.find();
    console.log(`Total Zones Found: ${zones.length}`);
    zones.forEach((z: any) => {
      console.log(`- Name: "${z.name}"`);
      console.log(`  ID: ${z._id}`);
      console.log(`  Type: ${z.type}`);
      console.log(`  Active: ${z.isActive}`);
      if (z.type === "circle") {
        console.log(`  Center: ${JSON.stringify(z.center?.coordinates)}`);
        console.log(`  Radius: ${z.radius} meters`);
      } else if (z.type === "polygon") {
        console.log(`  Boundary coordinates length: ${z.boundary?.coordinates?.[0]?.length || 0}`);
      }
    });

    // 2. Check Online/Offline Drivers
    console.log("\n--- 🚗 DRIVERS REGISTERED IN DATABASE ---");
    const totalDrivers = await Driver.countDocuments();
    const onlineDrivers = await Driver.find({ status: DriverStatus.ONLINE });
    console.log(`Total Drivers: ${totalDrivers}`);
    console.log(`Total Online Drivers: ${onlineDrivers.length}`);
    
    for (const d of onlineDrivers) {
      console.log(`- Driver ID: ${d._id}`);
      console.log(`  Vehicle: ${d.vehicleType}`);
      console.log(`  Available: ${d.isAvailable}`);
      console.log(`  Coordinates (Lng, Lat): ${JSON.stringify(d.currentLocation?.coordinates)}`);
    }

    // 3. Check Vendors (Restaurants) in Rajahmundry and East Godavari (Kakinada)
    console.log("\n--- 🍔 VENDORS (RESTAURANTS) SUMMARY ---");
    const rajahmundryVendors = await Vendor.find({ "detailedAddress.city": "Rajahmundry" });
    const kakinadaVendors = await Vendor.find({ "detailedAddress.city": "East Godavari" });
    console.log(`Total Restaurants in Rajahmundry: ${rajahmundryVendors.length}`);
    console.log(`Total Restaurants in Kakinada (East Godavari): ${kakinadaVendors.length}`);

    if (rajahmundryVendors.length > 0) {
      console.log("\n👉 Sample Rajahmundry Restaurants:");
      rajahmundryVendors.slice(0, 3).forEach((v: any) => {
        console.log(`- Name: "${v.name}"`);
        console.log(`  Coordinates (Lng, Lat): ${JSON.stringify(v.location?.coordinates)}`);
      });
    }

    if (kakinadaVendors.length > 0) {
      console.log("\n👉 Sample Kakinada (East Godavari) Restaurants:");
      kakinadaVendors.slice(0, 3).forEach((v: any) => {
        console.log(`- Name: "${v.name}"`);
        console.log(`  Coordinates (Lng, Lat): ${JSON.stringify(v.location?.coordinates)}`);
      });
    }

    // 4. Test Coordinate Checks
    console.log("\n--- 🧪 SIMULATING API LOOKUPS ---");
    const driverService = new DriverService();
    
    // Rajahmundry test coord
    const rLat = 17.0005;
    const rLng = 81.7831;
    console.log(`\nChecking Rajahmundry Center (Lat: ${rLat}, Lng: ${rLng})...`);
    const rDrivers = await driverService.getNearbyDrivers(rLat, rLng);
    const rVendors = await Vendor.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [rLng, rLat] },
          $maxDistance: 25000
        }
      }
    });
    console.log(`=> Found ${rDrivers.length} simulated online drivers in Rajahmundry.`);
    console.log(`=> Found ${rVendors.length} vendors within 25km of Rajahmundry Center.`);

    // Kakinada test coord
    const kLat = 16.9891;
    const kLng = 82.2475;
    console.log(`\nChecking Kakinada Center (Lat: ${kLat}, Lng: ${kLng})...`);
    const kDrivers = await driverService.getNearbyDrivers(kLat, kLng);
    const kVendors = await Vendor.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [kLng, kLat] },
          $maxDistance: 25000
        }
      }
    });
    console.log(`=> Found ${kDrivers.length} simulated online drivers in Kakinada.`);
    console.log(`=> Found ${kVendors.length} vendors within 25km of Kakinada Center.`);

  } catch (error) {
    console.error("❌ Error running checks:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    console.log("==================================================");
  }
}

runCheck();
