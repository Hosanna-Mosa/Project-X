import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import MeatCenter from "./src/database/models/MeatCenter";
import MeatItem from "./src/database/models/MeatItem";

dotenv.config({ path: path.join(__dirname, ".env") });

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/project-x";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const centers = await MeatCenter.find();
  console.log("--- Meat Centers (" + centers.length + ") ---");
  for (const c of centers) {
    console.log(`ID: ${c._id}, Name: ${c.name}, Email: ${c.email}, Phone: ${c.phone}`);
    const items = await MeatItem.find({ meatCenterId: c._id });
    console.log(`  Items count: ${items.length}`);
    for (const item of items) {
      console.log(`    - ID: ${item._id}, Name: ${item.name}, Price: ${item.price}, Available: ${item.isAvailable}, Global: ${item.isGlobalItem}`);
    }
  }

  process.exit(0);
}

run();
