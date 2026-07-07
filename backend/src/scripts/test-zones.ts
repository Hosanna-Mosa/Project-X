import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Zone, { ZoneType } from "../database/models/Zone";
import { ZonesService } from "../modules/zones/zones.service";
import { PricingService } from "../modules/pricing/pricing.service";
import { ServiceType } from "../database/models/Order";

dotenv.config();

const zonesService = new ZonesService();
const pricingService = new PricingService();

async function runTest() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DATABASE_URL);
  console.log("Connected successfully.");

  try {
    // 1. Clean up existing test zones
    console.log("\n🧹 Cleaning up previous test zones...");
    await Zone.deleteMany({ name: { $regex: /^TEST_/ } });

    // 2. Create a test Polygon Zone
    // A square area in Bangalore (HSR Layout area)
    // Coordinates: [longitude, latitude]
    console.log("Creating TEST_POLYGON_ZONE (1.8x multiplier)...");
    const polygonZone = await zonesService.createZone({
      name: "TEST_POLYGON_ZONE",
      type: ZoneType.POLYGON,
      pricingMultiplier: 1.8,
      isActive: true,
      boundary: {
        coordinates: [
          [
            [77.63, 12.91], // Bottom-Left
            [77.65, 12.91], // Bottom-Right
            [77.65, 12.93], // Top-Right
            [77.63, 12.93], // Top-Left
            [77.63, 12.91], // Close the polygon loop
          ]
        ]
      }
    });
    console.log(`Polygon Zone created: ${polygonZone.name} (ID: ${polygonZone._id})`);

    // 3. Create a test Circular Zone
    // A circle centered near Indiranagar
    console.log("Creating TEST_CIRCLE_ZONE (2.5x multiplier)...");
    const circleZone = await zonesService.createZone({
      name: "TEST_CIRCLE_ZONE",
      type: ZoneType.CIRCLE,
      pricingMultiplier: 2.5,
      isActive: true,
      center: {
        coordinates: [77.6409, 12.9719], // [longitude, latitude]
      },
      radius: 1000, // 1000 meters / 1km radius
    });
    console.log(`Circle Zone created: ${circleZone.name} (ID: ${circleZone._id})`);

    // 4. Run Coordinate Checks
    console.log("\n--- Testing Geofence Lookups & Pricing ---");

    const testCases = [
      {
        name: "Point INSIDE HSR Polygon Zone",
        lat: 12.9200,
        lng: 77.6400,
        expectedMultiplier: 1.8,
      },
      {
        name: "Point OUTSIDE HSR Polygon Zone",
        lat: 12.9500,
        lng: 77.6800,
        expectedMultiplier: 1.0,
      },
      {
        name: "Point INSIDE Indiranagar Circle Zone (500m from center)",
        lat: 12.9719,
        lng: 77.6450, // approx 440m away
        expectedMultiplier: 2.5,
      },
      {
        name: "Point OUTSIDE Indiranagar Circle Zone (3km from center)",
        lat: 12.9719,
        lng: 77.6100, // approx 3.3km away
        expectedMultiplier: 1.0,
      },
    ];

    for (const tc of testCases) {
      console.log(`\nChecking: ${tc.name}`);
      console.log(`Coordinates: Lat=${tc.lat}, Lng=${tc.lng}`);

      const matchedZone = await zonesService.getZoneForCoordinates(tc.lat, tc.lng);
      const multiplier = matchedZone ? matchedZone.pricingMultiplier : 1.0;

      console.log(`Matched Zone: ${matchedZone ? matchedZone.name : "None"}`);
      console.log(`Multiplier: ${multiplier}x (Expected: ${tc.expectedMultiplier}x)`);

      if (multiplier === tc.expectedMultiplier) {
        console.log("✅ Match Result: SUCCESS");
      } else {
        console.error("❌ Match Result: FAILED");
      }

      // Test pricing calculation output
      const breakdown = await pricingService.calculateFareBreakdown(
        ServiceType.CAB,
        5.0, // 5 km
        15,  // 15 minutes
        multiplier
      );
      console.log(`Base Fare: ${breakdown.baseFare}, Total: ${breakdown.total}`);
    }

    // Clean up
    console.log("\n🧹 Cleaning up test zones...");
    await Zone.deleteMany({ name: { $regex: /^TEST_/ } });
    console.log("Clean up finished.");

  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTest();
