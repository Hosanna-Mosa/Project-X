import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ZonesService } from "../modules/zones/zones.service";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function testGetZones() {
  console.log("==================================================");
  console.log("🔍 TESTING GET ZONES SERVICE");
  console.log("==================================================");
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB.");

    const zonesService = new ZonesService();
    console.log("Calling zonesService.getZones()...");
    const zones = await zonesService.getZones();
    console.log(`✅ Success! Found ${zones.length} zone(s):`);
    zones.forEach(z => {
      console.log(`- Zone: "${z.name}" (ID: ${z._id}), isActive: ${z.isActive}, DynamicSurge: ${z.currentSurge}`);
    });
  } catch (error: any) {
    console.error("❌ Error caught during zonesService.getZones():");
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    console.log("==================================================");
  }
}

testGetZones();
