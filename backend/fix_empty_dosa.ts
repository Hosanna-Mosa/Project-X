import mongoose from "mongoose";
import dotenv from "dotenv";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  const res = await FoodItem.updateMany(
    { 'images.0': '' },
    { images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Dosa_with_Chutney_and_Sambar.jpg/1280px-Dosa_with_Chutney_and_Sambar.jpg'] }
  );

  console.log("Updated dosas:", res.modifiedCount);
  process.exit(0);
}

run();
