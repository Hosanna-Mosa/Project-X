import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  // Use a known good Vada/Indian snack image URL
  const vadaImageUrl = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400';

  const vendors = await Vendor.find({ name: /Sai Ram Tiffin Center/i });
  let count = 0;

  for (const vendor of vendors) {
    const items = await FoodItem.find({ vendorId: vendor._id, name: /vada/i });
    for (const item of items) {
      item.images = [vadaImageUrl];
      await item.save();
      count++;
    }
  }

  console.log(`Updated ${count} Vada items!`);
  process.exit(0);
}

run();
