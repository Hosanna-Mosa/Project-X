import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");
  const vendor = await Vendor.findOne({ name: /Sai Ram Tiffin Center/i });
  if (!vendor) {
    console.log("Vendor not found");
    process.exit(1);
  }
  const items = await FoodItem.find({ vendorId: vendor._id });
  console.log("ITEMS:");
  items.forEach(i => console.log(i.name));
  process.exit(0);
}
run();
