import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");
  const vendors = await Vendor.find({ name: /Sai Ram/i });
  for (const v of vendors) {
    const items = await FoodItem.find({ vendorId: v._id });
    console.log(`Vendor: ${v.name} (${v._id}) - Items: ${items.length}`);
    if (items.length > 0) {
      console.log(`  First item: ${items[0].name} -> ${items[0].images}`);
    }
  }
  process.exit(0);
}
run();
