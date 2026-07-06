import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");
  const vendor = await Vendor.findOne({ name: /Sai Ram/i });
  const dosa = await FoodItem.findOne({ name: /dosa/i, vendorId: vendor?._id });
  console.log("DB DOSA IMAGE:", dosa?.images);

  try {
     const res = await fetch(`http://localhost:5000/api/v1/food/vendor/${vendor?._id}`);
     const data = await res.json();
     const dosaApi = data.find((i: any) => i.name.toLowerCase().includes("dosa"));
     console.log("API DOSA IMAGE:", dosaApi?.images);
  } catch (err) {
     console.log("API FETCH ERROR:", err);
  }

  process.exit(0);
}
run();
