import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Vendor from "./models/Vendor";
import Zone from "./models/Zone";
import { connectDB } from "./db";
import { ZonesService } from "../modules/zones/zones.service";

dotenv.config();

const runTest = async () => {
  try {
    await connectDB();
    console.log("Connected to db");

    const userLat = 17.3850;
    const userLng = 78.4867;

    const zonesService = new ZonesService();
    const activeZone = await zonesService.getZoneForCoordinates(userLat, userLng);
    console.log("Active Zone:", activeZone ? activeZone.name : "null");

    const radiusInMeters = 20000000;

    const vendors = await Vendor.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLng, userLat],
          },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true,
          key: "location",
          query: { partnerType: { $ne: "meat" } },
        },
      }
    ]);

    console.log("Found vendors:", vendors.length);
    console.log(vendors.map(v => v.name));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
runTest();
