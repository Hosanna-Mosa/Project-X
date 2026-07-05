require("dotenv").config();
const mongoose = require("mongoose");
const Vendor = require("./dist/database/models/Vendor").default;
const FoodItem = require("./dist/database/models/FoodItem").default;

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
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
