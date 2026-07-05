import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";
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

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  const files = fs.readdirSync(artifactDir);
  const getLatestImage = (prefix: string) => {
    const matching = files.filter(f => f.startsWith(prefix) && f.endsWith(".png"));
    if (matching.length === 0) return null;
    matching.sort(); // Get the latest one
    return path.join(artifactDir, matching[matching.length - 1]);
  };

  const imagePaths: Record<string, string> = {
    dosa: getLatestImage("dosa_img")!,
    idli: getLatestImage("idli_img")!,
    vada: getLatestImage("vada_img")!,
    uttapam: getLatestImage("uttapam_img")!,
    upma: getLatestImage("upma_img")!,
    rice: getLatestImage("rice_bowl_img")!,
    curry: getLatestImage("paneer_curry_img") || getLatestImage("paneer_masala")!,
    naan: getLatestImage("butter_naan")!,
    starter: getLatestImage("tikka_kebab")!,
    sweet: getLatestImage("kunafa")!,
    drink: getLatestImage("mint_lemonade")!
  };

  console.log("Uploading base images to Cloudinary...");
  const imageUrls: Record<string, string> = {};
  for (const [key, p] of Object.entries(imagePaths)) {
    if (!p) {
       console.log("Missing image for " + key);
       continue;
    }
    console.log(`Uploading ${key}...`);
    const url = await uploadImage(p);
    if (url) imageUrls[key] = url;
  }

  const vendor = await Vendor.findOne({ name: /Sai Ram Tiffin Center/i });
  if (!vendor) {
    console.log("Vendor not found");
    process.exit(1);
  }

  const items = await FoodItem.find({ vendorId: vendor._id });
  let updatedCount = 0;

  for (const item of items) {
    const name = item.name.toLowerCase();
    let selectedKey = "curry"; // Default fallback

    if (name.includes("dosa") || name.includes("pesarattu") || name.includes("appam")) selectedKey = "dosa";
    else if (name.includes("idli") || name.includes("idiyappam")) selectedKey = "idli";
    else if (name.includes("vada") || name.includes("wada")) selectedKey = "vada";
    else if (name.includes("uttapam") || name.includes("uthappam")) selectedKey = "uttapam";
    else if (name.includes("upma") || name.includes("pongal") || name.includes("poha") || name.includes("khichdi")) selectedKey = "upma";
    else if (name.includes("rice") || name.includes("pulao") || name.includes("biryani")) selectedKey = "rice";
    else if (name.includes("naan") || name.includes("roti") || name.includes("paratha") || name.includes("thepla") || name.includes("toast") || name.includes("sandwich")) selectedKey = "naan";
    else if (name.includes("manchurian dry") || name.includes("chilli") || name.includes("spring roll") || name.includes("momos") || name.includes("tikka") || name.includes("dhokla") || name.includes("khandvi") || name.includes("noodles") || name.includes("chopsuey")) selectedKey = "starter";
    else if (name.includes("sweet") || name.includes("chocolate")) selectedKey = "sweet";
    else if (name.includes("salad") || name.includes("lemonade")) selectedKey = "drink";

    if (imageUrls[selectedKey]) {
      item.images = [imageUrls[selectedKey]];
      await item.save();
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} tiffin items with realistic images!`);
  process.exit(0);
}
run();
