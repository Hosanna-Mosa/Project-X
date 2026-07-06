import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (filePath: string) => {
  try {
    const res = await cloudinary.uploader.upload(filePath, { folder: "project-x-demo" });
    return res.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return null;
  }
};

const artifactDir = "C:/Users/mahid/.gemini/antigravity-ide/brain/c2216c7d-6322-4315-acb8-8ba353baab77";
const fs = require('fs');

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  // Find all generated images
  const files = fs.readdirSync(artifactDir);
  const imageMap: Record<string, string> = {};
  
  for (const file of files) {
    if (file.endsWith(".png")) {
      // e.g. faham_mandi_1783086567422.png
      let key = file.replace(/_\d+\.png$/, "");
      imageMap[key] = path.join(artifactDir, file);
    }
  }
  
  const foodMapping: Record<string, string> = {
    "Chicken Dum Biryani Single": "biryani_single",
    "Chicken Dum Biryani Family Pack": "biryani_family",
    "Chicken Tikka Kebab": "tikka_kebab",
    "Paneer Butter Masala": "paneer_masala",
    "Butter Naan": "butter_naan",
    "Chicken Faham Mandi": "faham_mandi",
    "Mutton Juicy Mandi": "mutton_mandi",
    "Chicken Shawarma": "chicken_shawarma",
    "Kunafa": "kunafa",
    "Mint Lemonade": "mint_lemonade"
  };

  const vendors = await Vendor.find({ name: { $in: ["Alif", "Barkas Arabian Kitchen"] } });
  
  for (const v of vendors) {
    const items = await FoodItem.find({ vendorId: v._id });
    for (const item of items) {
       const key = foodMapping[item.name];
       if (key && imageMap[key]) {
          console.log(`Uploading ${key} for ${item.name}...`);
          const url = await uploadImage(imageMap[key]);
          if (url) {
             item.images = [url];
             await item.save();
             console.log(`Updated ${item.name} with URL: ${url}`);
          }
       }
    }
  }

  console.log("Images updated!");
  
  // Test $geoNear for Rajahmundry
  const userLat = 17.0005;
  const userLng = 81.8040;
  const vendorsNear = await Vendor.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLng, userLat],
          },
          distanceField: "distance",
          maxDistance: 25000,
          spherical: true,
          key: "location",
          query: { partnerType: { $ne: "meat" } },
        },
      }
    ]);
  console.log("Nearby Vendors for [81.8040, 17.0005]:", vendorsNear.map(v => v.name));

  process.exit(0);
}
run();
