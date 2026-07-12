import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Zone, { ZoneType } from "./models/Zone";
import { connectDB } from "./db";

dotenv.config();

const seedZones = async () => {
  try {
    await connectDB();
    console.log("Connected to database...");

    await Zone.deleteMany({});
    console.log("Cleared existing zones.");

    const globalZone = new Zone({
      name: "Global Dev Zone",
      type: ZoneType.CIRCLE,
      center: {
        type: "Point",
        coordinates: [78.4867, 17.3850], // Long, Lat
      },
      radius: 20000000, // 20,000 km (covers the entire earth basically)
      isActive: true,
      pricingMultiplier: 1.0,
      description: "Global zone for development",
    });

    await globalZone.save();
    console.log("Successfully seeded global zone!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding zones:", error);
    process.exit(1);
  }
};

seedZones();
