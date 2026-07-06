import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  const imageMap: Record<string, string> = {
    dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400',
    idli: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400',
    vada: 'https://images.unsplash.com/photo-1605333190897-4df33fc1192e?w=400',
    uttapam: 'https://images.unsplash.com/photo-1626779848777-1d5423f05141?w=400',
    upma: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400',
    rice: 'https://images.unsplash.com/photo-1633383718081-22ac93e3db65?w=400',
    paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=400',
    naan: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
    momos: 'https://images.unsplash.com/photo-1625938146369-adc83368bda7?w=400',
    sweet: 'https://images.unsplash.com/photo-1605197584547-c91ffaba2dc1?w=400'
  };

  const vendors = await Vendor.find({ name: /Sai Ram Tiffin Center/i });
  let count = 0;

  for (const vendor of vendors) {
    const items = await FoodItem.find({ vendorId: vendor._id });

    for (const item of items) {
      const name = item.name.toLowerCase();
      let key = "paneer";
      if (name.includes("dosa") || name.includes("pesarattu") || name.includes("appam")) key = "dosa";
      else if (name.includes("idli")) key = "idli";
      else if (name.includes("vada") || name.includes("wada")) key = "vada";
      else if (name.includes("uttapam") || name.includes("uthappam")) key = "uttapam";
      else if (name.includes("upma") || name.includes("pongal") || name.includes("poha")) key = "upma";
      else if (name.includes("rice") || name.includes("pulao") || name.includes("biryani")) key = "rice";
      else if (name.includes("naan") || name.includes("roti") || name.includes("paratha") || name.includes("thepla") || name.includes("sandwich")) key = "naan";
      else if (name.includes("momos") || name.includes("manchurian") || name.includes("noodles") || name.includes("roll")) key = "momos";
      else if (name.includes("sweet") || name.includes("chocolate")) key = "sweet";

      if (imageMap[key]) {
        item.images = [imageMap[key]];
        await item.save();
        count++;
      }
    }
  }
  
  console.log(`Force updated ${count} items across ${vendors.length} vendors with Unsplash images!`);
  process.exit(0);
}

run();
