import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";
import * as http from "http";
import * as https from "https";

dotenv.config();

// Ensure URLs are active and distinct
const imageMap: Record<string, string> = {
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400', 
  idli: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400', // Idli
  vada: 'https://images.unsplash.com/photo-1626779848777-1d5423f05141?w=400', // Vada
  uttapam: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
  upma: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400',
  rice: 'https://images.unsplash.com/photo-1633383718081-22ac93e3db65?w=400',
  paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=400',
  naan: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
  momos: 'https://images.unsplash.com/photo-1625938146369-adc83368bda7?w=400',
  sweet: 'https://images.unsplash.com/photo-1605197584547-c91ffaba2dc1?w=400'
};

function getCategory(name: string): string {
  name = name.toLowerCase();
  if (name.includes("dosa") || name.includes("pesarattu") || name.includes("appam")) return "dosa";
  if (name.includes("idli")) return "idli";
  if (name.includes("vada") || name.includes("wada") || name.includes("gari") || name.includes("garry")) return "vada";
  if (name.includes("uttapam") || name.includes("uthappam")) return "uttapam";
  if (name.includes("upma") || name.includes("pongal") || name.includes("poha")) return "upma";
  if (name.includes("rice") || name.includes("pulao") || name.includes("biryani")) return "rice";
  if (name.includes("naan") || name.includes("roti") || name.includes("paratha") || name.includes("thepla") || name.includes("sandwich")) return "naan";
  if (name.includes("momos") || name.includes("manchurian") || name.includes("noodles") || name.includes("roll")) return "momos";
  if (name.includes("sweet") || name.includes("chocolate") || name.includes("gulab") || name.includes("jamun") || name.includes("halwa")) return "sweet";
  return "paneer";
}

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  const vendors = await Vendor.find({ name: /Sai Ram Tiffin Center/i });
  let deletedCount = 0;
  let keptCount = 0;

  for (const vendor of vendors) {
    const items = await FoodItem.find({ vendorId: vendor._id });
    const seenCategories = new Set<string>();

    for (const item of items) {
      const cat = getCategory(item.name);
      
      if (!seenCategories.has(cat)) {
        // Keep this item
        seenCategories.add(cat);
        item.images = [imageMap[cat] || imageMap.paneer];
        
        // Let's rename it to something clean and simple
        if (cat === "dosa") item.name = "Special Ghee Karam Dosa";
        if (cat === "idli") item.name = "Steamed Button Idli (4 pcs)";
        if (cat === "vada") item.name = "Crispy Medu Vada (2 pcs)";
        if (cat === "uttapam") item.name = "Onion Tomato Uttapam";
        if (cat === "upma") item.name = "Ghee Upma";
        if (cat === "rice") item.name = "Special Veg Fried Rice";
        
        await item.save();
        keptCount++;
      } else {
        // Delete duplicate category items
        await FoodItem.deleteOne({ _id: item._id });
        deletedCount++;
      }
    }
  }

  console.log(`Cleaned up! Kept ${keptCount} unique items. Deleted ${deletedCount} duplicates.`);
  process.exit(0);
}

run();
