import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Zone, { ZoneType } from "../database/models/Zone";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb+srv://sunandvemavarapu_db_user:h5wPWY3uxifM95Rr@cluster0.tdar1ey.mongodb.net/?appName=Cluster0";

const allNewZones = [
  // ── RAJAHMUNDRY ZONES ──────────────────────────────────────────────────────
  {
    name: "Rajahmundry Central (Devichowk & Jampeta)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.1,
    isActive: true,
    description: "Central Rajahmundry covering Devichowk, Jampeta, Danavaipeta, and main business markets.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.760, 16.980],
          [81.800, 16.980],
          [81.800, 17.010],
          [81.760, 17.010],
          [81.760, 16.980]
        ]
      ]
    }
  },
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
          [81.770, 17.000]
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
          [81.800, 16.980]
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
          [81.770, 16.970]
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
          [81.750, 16.950]
        ]
      ]
    }
  },
  {
    name: "Rajahmundry West (Railway Station & Kovvur Bridge)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.15,
    isActive: true,
    description: "Western zone covering Rajahmundry railway station, Kovvur bridge entry and surrounding residential hubs.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.740, 16.980],
          [81.770, 16.980],
          [81.770, 17.015],
          [81.740, 17.015],
          [81.740, 16.980]
        ]
      ]
    }
  },
  {
    name: "Rajahmundry North-East (Bomuru & Diwancheruvu)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.2,
    isActive: true,
    description: "Outer north-eastern zone covering Bomuru, Diwancheruvu, NH-16 margins, and educational hubs.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.800, 17.010],
          [81.850, 17.010],
          [81.850, 17.045],
          [81.800, 17.045],
          [81.800, 17.010]
        ]
      ]
    }
  },

  // ── KAKINADA ZONES ─────────────────────────────────────────────────────────
  {
    name: "Kakinada Central (Bhanugudi & Main Road)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.15,
    isActive: true,
    description: "Commercial core of Kakinada covering Bhanugudi junction, Main Road, Temple Street and municipal zones.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [82.230, 16.980],
          [82.260, 16.980],
          [82.260, 17.005],
          [82.230, 17.005],
          [82.230, 16.980]
        ]
      ]
    }
  },
  {
    name: "Kakinada North (Sarpavaram & Madhavapatnam)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.2,
    isActive: true,
    description: "Northern Kakinada covering Sarpavaram junction, Madhavapatnam, and surrounding tech/residential zones.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [82.220, 17.005],
          [82.260, 17.005],
          [82.260, 17.035],
          [82.220, 17.035],
          [82.220, 17.005]
        ]
      ]
    }
  },
  {
    name: "Kakinada South (Jagannaickpur & Port Area)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.25,
    isActive: true,
    description: "Southern Kakinada covering Jagannaickpur, Port Road, Kakinada Port, and industrial zones.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [82.230, 16.950],
          [82.270, 16.950],
          [82.270, 16.980],
          [82.230, 16.980],
          [82.230, 16.950]
        ]
      ]
    }
  },
  {
    name: "Kakinada West (Ramanayyapeta & Gangaraju Nagar)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.1,
    isActive: true,
    description: "Western suburban zone covering Ramanayyapeta, Gangaraju Nagar, and railway colony area.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [82.200, 16.970],
          [82.230, 16.970],
          [82.230, 17.005],
          [82.200, 17.005],
          [82.200, 16.970]
        ]
      ]
    }
  },
  // ── ATREYAPURAM ZONES ──────────────────────────────────────────────────────
  {
    name: "Atreyapuram Central (Village & Markets)",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.15,
    isActive: true,
    description: "Core zone covering Atreyapuram village center, local markets, and main residential streets.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.765, 16.815],
          [81.805, 16.815],
          [81.805, 16.845],
          [81.765, 16.845],
          [81.765, 16.815]
        ]
      ]
    }
  },
  {
    name: "Atreyapuram North & Ryali",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.2,
    isActive: true,
    description: "Operational zone covering northern outskirts of Atreyapuram and the neighboring Ryali village area.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [81.775, 16.845],
          [81.825, 16.845],
          [81.825, 16.885],
          [81.775, 16.885],
          [81.775, 16.845]
        ]
      ]
    }
  },
  // ── YANAM ZONES ────────────────────────────────────────────────────────────
  {
    name: "Yanam Central",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.15,
    isActive: true,
    description: "Core zone covering Yanam municipal center and main local markets.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [82.190, 16.710],
          [82.230, 16.710],
          [82.230, 16.750],
          [82.190, 16.750],
          [82.190, 16.710]
        ]
      ]
    }
  },
  {
    name: "Yanam Ferry & Riverfront",
    type: ZoneType.POLYGON,
    pricingMultiplier: 1.2,
    isActive: true,
    description: "Operational zone covering Yanam Ferry Road, Gautami riverfront, and surrounding regions.",
    allowedServices: ["bike", "auto", "cab", "cab_prime", "delivery", "helper"],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [82.170, 16.720],
          [82.210, 16.720],
          [82.210, 16.760],
          [82.170, 16.760],
          [82.170, 16.720]
        ]
      ]
    }
  }
];

async function seedZones() {
  console.log("==================================================");
  console.log("🌱 SEEDING OPERATIONAL ZONES (RAJAHMUNDRY, KAKINADA, ATREYAPURAM & YANAM)");
  console.log("==================================================");
  console.log(`Connecting to database...`);
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected successfully to MongoDB.");

    // Remove existing Rajahmundry, Kakinada, Atreyapuram and Yanam zones
    console.log("Cleaning up previous Rajahmundry, Kakinada, Atreyapuram & Yanam zones...");
    const cleanupResult = await Zone.deleteMany({
      name: { $regex: /(Rajahmundry|Kakinada|Atreyapuram|Yanam)/i }
    });
    console.log(`Removed ${cleanupResult.deletedCount} old zone entries.`);

    console.log(`Inserting ${allNewZones.length} operational zones...`);
    const createdZones = await Zone.create(allNewZones);
    console.log(`✅ Successfully seeded ${createdZones.length} zones!`);
    
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
