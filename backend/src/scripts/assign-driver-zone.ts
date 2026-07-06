import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Driver from "../database/models/Driver";
import Zone from "../database/models/Zone";
import User from "../database/models/User";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

async function main() {
  const args = process.argv.slice(2);
  const driverId = args[0];
  const zoneId = args[1];

  console.log("==================================================");
  console.log("✏️  ASSIGN DRIVER TO ZONE");
  console.log("==================================================");
  
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB.");
    // Reference User model to register its schema
    const _registerSchema = User;

    if (!driverId || !zoneId) {
      console.log("\n❌ Usage: npx ts-node src/scripts/assign-driver-zone.ts <DRIVER_ID> <ZONE_ID>");
      console.log("\nAvailable Zones:");
      const zones = await Zone.find();
      zones.forEach(z => console.log(`- Zone: "${z.name}" | ID: ${z._id}`));

      console.log("\nRegistered Drivers:");
      const drivers = await Driver.find().populate("user");
      drivers.forEach(d => {
        const name = (d.user as any)?.name || "Unknown";
        console.log(`- Driver: "${name}" | Phone: ${(d.user as any)?.phone || "N/A"} | ID: ${d._id} | Current Zone ID: ${d.preferredZone || "None"}`);
      });
      return;
    }

    // Perform update
    const driver = await Driver.findById(driverId);
    if (!driver) {
      console.log(`❌ Driver not found with ID: ${driverId}`);
      return;
    }

    const zone = await Zone.findById(zoneId);
    if (!zone) {
      console.log(`❌ Zone not found with ID: ${zoneId}`);
      return;
    }

    driver.preferredZone = zone._id;
    await driver.save();
    console.log(`\n✅ Success! Assigned Driver to Zone "${zone.name}" (${zoneId}).`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    console.log("==================================================");
  }
}

main();
