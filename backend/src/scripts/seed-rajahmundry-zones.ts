import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Zone, { ZoneType } from "../database/models/Zone";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb+srv://sunandvemavarapu_db_user:h5wPWY3uxifM95Rr@cluster0.tdar1ey.mongodb.net/?appName=Cluster0";

const rajahmundryZones = [
  {
    name: "Rajahmundry North (Lalacheruvu)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.2,
    isActive: true,
    description: "Operational zone covering Lalacheruvu, Danavaipeta and northern parts of Rajahmundry.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.770, 17.000],
          [81.800, 17.000],
          [81.800, 17.025],
          [81.770, 17.025],
          [81.770, 17.000] // closed loop
        ]
      ]
    }
  },
  {
    name: "Rajahmundry East (Morampudi)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.3,
    isActive: true,
    description: "Operational zone covering Morampudi, Hukumpeta and eastern parts of Rajahmundry.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.800, 16.980],
          [81.830, 16.980],
          [81.830, 17.010],
          [81.800, 17.010],
          [81.800, 16.980] // closed loop
        ]
      ]
    }
  },
  {
    name: "Rajahmundry South (Innespeta)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.25,
    isActive: true,
    description: "Operational zone covering Innespeta, Kotipalli Bus Stand, and southern commercial districts.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.770, 16.970],
          [81.800, 16.970],
          [81.800, 17.000],
          [81.770, 17.000],
          [81.770, 16.970] // closed loop
        ]
      ]
    }
  },
  {
    name: "Rajahmundry Dowleswaram (South-West)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.2,
    isActive: true,
    description: "Operational zone covering Dowleswaram, Godavari riverfront, and south-western parts.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.750, 16.950],
          [81.780, 16.950],
          [81.780, 16.980],
          [81.750, 16.980],
          [81.750, 16.950] // closed loop
        ]
      ]
    }
  }
];

async function seedZones() {
  console.log("==================================================");
  console.log("🌱 SEEDING RAJAHMUNDRY OPERATIONAL ZONES");
  console.log("==================================================");
  console.log(`Connecting to database...`);
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected successfully to MongoDB.");

    // Remove existing Rajahmundry zones if they exist to prevent duplicate seed entries
    console.log("Cleaning up previous Rajahmundry zones...");
    const cleanupResult = await Zone.deleteMany({
      name: { $regex: /Rajahmundry/i }
    });
    console.log(`Removed ${cleanupResult.deletedCount} old Rajahmundry zone entries.`);

    console.log("Inserting 4 Rajahmundry operational zones...");
    const createdZones = await Zone.create(rajahmundryZones);
    console.log(`✅ Successfully seeded ${createdZones.length} Rajahmundry zones!`);
    
    for (const z of createdZones) {
      console.log(` - ${z.name} (${z.pricingMultiplier}x surge)`);
    }

  } catch (error) {
    console.error("❌ Error seeding zones:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    console.log("==================================================");
  }
}

seedZones();
