import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./src/database/models/User";
import Zone, { ZoneType } from "./src/database/models/Zone";
import Vendor from "./src/database/models/Vendor";
import MeatCenter from "./src/database/models/MeatCenter";
import Driver from "./src/database/models/Driver";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/projectx";

async function listZoneEntities() {
  // Explicitly reference User to ensure schema registration in Mongoose
  if (!mongoose.models.User) {
    const _user = User;
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DATABASE_URL);
  console.log("Connected successfully.\n");

  const allZones = await Zone.find().sort({ name: 1 });
  const allDrivers = await Driver.find().populate({ path: "user", model: User });
  const allVendors = await Vendor.find({ partnerType: { $ne: "meat" } });
  const allMeatCenters = await MeatCenter.find();
  const allVendorMeats = await Vendor.find({ partnerType: "meat" });

  console.log(`================================================================`);
  console.log(`📊 SUMMARY METRICS:`);
  console.log(`   Total Zones: ${allZones.length}`);
  console.log(`   Total Drivers: ${allDrivers.length}`);
  console.log(`   Total Food Restaurants: ${allVendors.length}`);
  console.log(`   Total Meat Outlets: ${allMeatCenters.length + allVendorMeats.length}`);
  console.log(`================================================================\n`);

  for (const zone of allZones) {
    console.log("================================================================");
    console.log(`📍 ZONE: ${zone.name.toUpperCase()} (ID: ${zone._id})`);
    console.log(`   Type: ${zone.type} | Active: ${zone.isActive ? "YES" : "NO"} | Surge Multiplier: ${zone.pricingMultiplier}x`);
    if (zone.type === ZoneType.CIRCLE && zone.center) {
      console.log(`   Center: [Lng: ${zone.center.coordinates[0]}, Lat: ${zone.center.coordinates[1]}] | Radius: ${zone.radius}m`);
    } else if (zone.type === ZoneType.POLYGON && zone.boundary) {
      const pointsCount = zone.boundary.coordinates[0]?.length || 0;
      console.log(`   Boundary: Polygon with ${pointsCount} points`);
    }
    console.log("----------------------------------------------------------------");

    // 1. Query Drivers in zone (via location or preferredZone)
    let drivers: any[] = [];
    try {
      if (zone.type === ZoneType.POLYGON && zone.boundary) {
        drivers = await Driver.find({
          $or: [
            { currentLocation: { $geoWithin: { $geometry: zone.boundary } } },
            { preferredZone: zone._id },
            { preferredZones: zone._id }
          ]
        }).populate({ path: "user", model: User });
      } else if (zone.type === ZoneType.CIRCLE && zone.center && zone.radius) {
        drivers = await Driver.find({
          $or: [
            { currentLocation: { $near: { $geometry: zone.center, $maxDistance: zone.radius } } },
            { preferredZone: zone._id },
            { preferredZones: zone._id }
          ]
        }).populate({ path: "user", model: User });
      }
    } catch (e: any) {
      // Fallback: manually match drivers by preferredZone
      drivers = allDrivers.filter((d: any) => 
        String(d.preferredZone) === String(zone._id) || 
        (Array.isArray(d.preferredZones) && d.preferredZones.some((pz: any) => String(pz) === String(zone._id)))
      );
    }

    // 2. Query Food Restaurants in zone
    let foodRestaurants: any[] = [];
    try {
      if (zone.type === ZoneType.POLYGON && zone.boundary) {
        foodRestaurants = await Vendor.find({
          partnerType: { $ne: "meat" },
          location: { $geoWithin: { $geometry: zone.boundary } }
        });
      } else if (zone.type === ZoneType.CIRCLE && zone.center && zone.radius) {
        foodRestaurants = await Vendor.find({
          partnerType: { $ne: "meat" },
          location: { $near: { $geometry: zone.center, $maxDistance: zone.radius } }
        });
      }
    } catch (e: any) {
      console.error("  Error querying food restaurants:", e.message);
    }

    // 3. Query Meat Stores in zone
    let meatStores: any[] = [];
    try {
      if (zone.type === ZoneType.POLYGON && zone.boundary) {
        const mc = await MeatCenter.find({
          location: { $geoWithin: { $geometry: zone.boundary } }
        });
        const vm = await Vendor.find({
          partnerType: "meat",
          location: { $geoWithin: { $geometry: zone.boundary } }
        });
        meatStores = [...mc, ...vm];
      } else if (zone.type === ZoneType.CIRCLE && zone.center && zone.radius) {
        const mc = await MeatCenter.find({
          location: { $near: { $geometry: zone.center, $maxDistance: zone.radius } }
        });
        const vm = await Vendor.find({
          partnerType: "meat",
          location: { $near: { $geometry: zone.center, $maxDistance: zone.radius } }
        });
        meatStores = [...mc, ...vm];
      }
    } catch (e: any) {
      console.error("  Error querying meat stores:", e.message);
    }

    // Output Drivers
    console.log(`\n 🛵 DRIVERS IN THIS ZONE (${drivers.length}):`);
    if (drivers.length === 0) {
      console.log("    (No drivers registered/located in this zone)");
    } else {
      drivers.forEach((d, i) => {
        const u = d.user as any;
        const name = u?.name || "Driver (No Name)";
        const phone = u?.phone || u?.email || "N/A";
        const status = d.status || "OFFLINE";
        const coords = d.currentLocation?.coordinates ? `[${d.currentLocation.coordinates[0]}, ${d.currentLocation.coordinates[1]}]` : "No GPS Coords";
        console.log(`    ${i + 1}. ${name} | Phone: ${phone} | Status: ${status} | Vehicle: ${d.vehicleType || 'N/A'} | Coords: ${coords}`);
      });
    }

    // Output Restaurants
    console.log(`\n 🍕 FOOD RESTAURANTS IN THIS ZONE (${foodRestaurants.length}):`);
    if (foodRestaurants.length === 0) {
      console.log("    (No food restaurants located in this zone)");
    } else {
      foodRestaurants.forEach((r, i) => {
        const categories = r.categories?.join(", ") || "General";
        const coords = r.location?.coordinates ? `[${r.location.coordinates[0]}, ${r.location.coordinates[1]}]` : "N/A";
        console.log(`    ${i + 1}. ${r.name} | Address: ${r.address || 'N/A'} | Rating: ${r.rating || 0}★ | Categories: ${categories} | Coords: ${coords}`);
      });
    }

    // Output Meat Stores
    console.log(`\n 🥩 MEAT STORES IN THIS ZONE (${meatStores.length}):`);
    if (meatStores.length === 0) {
      console.log("    (No meat stores located in this zone)");
    } else {
      meatStores.forEach((m, i) => {
        const categories = m.categories?.join(", ") || "Meat";
        const coords = m.location?.coordinates ? `[${m.location.coordinates[0]}, ${m.location.coordinates[1]}]` : "N/A";
        console.log(`    ${i + 1}. ${m.name} | Address: ${m.address || 'N/A'} | Rating: ${m.rating || 0}★ | Categories: ${categories} | Coords: ${coords}`);
      });
    }

    console.log("\n");
  }

  process.exit(0);
}

listZoneEntities().catch((err) => {
  console.error("Script execution failed:", err);
  process.exit(1);
});
