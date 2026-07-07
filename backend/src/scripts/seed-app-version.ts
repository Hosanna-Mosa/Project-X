import mongoose from "mongoose";
import * as dotenv from "dotenv";
import AppVersion from "../database/models/AppVersion";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb+srv://sunandvemavarapu_db_user:h5wPWY3uxifM95Rr@cluster0.tdar1ey.mongodb.net/?appName=Cluster0";

const initialVersions = [
  {
    platform: "ios",
    latest: "1.2.0",
    minRequired: "1.1.0",
    storeUrl: "https://apps.apple.com/app/flavour/id123456"
  },
  {
    platform: "android",
    latest: "1.2.0",
    minRequired: "1.1.0",
    storeUrl: "https://play.google.com/store/apps/details?id=com.flavour"
  }
];

async function seedAppVersions() {
  console.log("==================================================");
  console.log("🌱 SEEDING APP VERSION CONTROL SETTINGS");
  console.log("==================================================");
  console.log(`Connecting to database...`);
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected successfully to MongoDB.");

    console.log("Cleaning up existing app version records...");
    await AppVersion.deleteMany({});

    console.log("Seeding platform app versions...");
    const created = await AppVersion.create(initialVersions);
    console.log(`✅ Successfully seeded version settings for platforms:`);
    for (const v of created) {
      console.log(` - ${v.platform}: latest = ${v.latest}, minRequired = ${v.minRequired}`);
    }

  } catch (error) {
    console.error("❌ Error seeding app versions:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    console.log("==================================================");
  }
}

seedAppVersions();
