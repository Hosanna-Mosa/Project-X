import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");
  const vendors = await Vendor.find({ name: { $in: ["Alif", "Barkas Arabian Kitchen"] } });
  console.log("Vendors:", vendors.map(v => v.name));
  
  for (const v of vendors) {
     console.log(v.name, v.location.coordinates);
     const items = await FoodItem.find({ vendorId: v._id });
     console.log(`- ${v.name} Items: ${items.length}`);
     items.forEach(i => console.log(`  * ${i.name} -> images:`, i.images));
  }
  
  process.exit(0);
}
run();
