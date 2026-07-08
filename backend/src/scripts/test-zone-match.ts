import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ZonesService } from "../modules/zones/zones.service";
import Zone from "../database/models/Zone";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb+srv://sunandvemavarapu_db_user:h5wPWY3uxifM95Rr@cluster0.tdar1ey.mongodb.net/?appName=Cluster0";

async function testMatch() {
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB");

  const zonesService = new ZonesService();

  // Test coordinates
  const coords = [
    { name: "Rajahmundry Center", lat: 17.0005, lng: 81.7840 },
    { name: "Rajahmundry East (Morampudi)", lat: 16.995, lng: 81.810 },
    { name: "Kakinada Center", lat: 16.9891, lng: 82.2439 },
    { name: "Outside operational area", lat: 12.9716, lng: 77.5946 }
  ];

  for (const c of coords) {
    console.log(`\nTesting: ${c.name} (Lat: ${c.lat}, Lng: ${c.lng})`);
    
    // Test direct MongoDB query
    const directQuery = await Zone.findOne({
      type: "polygon",
      isActive: true,
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [c.lng, c.lat]
          }
        }
      }
    });

    console.log("Direct query match:", directQuery ? directQuery.name : "NONE");

    // Test service lookup
    const serviceMatch = await zonesService.getZoneForCoordinates(c.lat, c.lng);
    console.log("ZonesService match:", serviceMatch ? serviceMatch.name : "NONE");
  }

  await mongoose.disconnect();
}

testMatch();
