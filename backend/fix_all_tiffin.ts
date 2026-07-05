import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  const imageMap: Record<string, string> = {
    dosa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Dosa_with_Chutney_and_Sambar.jpg/1280px-Dosa_with_Chutney_and_Sambar.jpg',
    idli: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Idli_Sambar.JPG',
    vada: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Medu_Vadas.JPG/1280px-Medu_Vadas.JPG',
    uttapam: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Mini_Uttappam.jpg/1280px-Mini_Uttappam.jpg',
    upma: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/A_photo_of_Upma.jpg/1280px-A_photo_of_Upma.jpg',
    rice: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Chitranna_and_Payasa.jpg/1280px-Chitranna_and_Payasa.jpg',
    paneer: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Panir_Paneer_Indian_cheese_fresh.jpg/1280px-Panir_Paneer_Indian_cheese_fresh.jpg',
    naan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/1280px-Annapurna_Naan.jpg',
    momos: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Momo_nepal.jpg/1280px-Momo_nepal.jpg',
    sweet: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Gulab-jamun-wallpaper-1.jpg'
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
  
  console.log(`Force updated ${count} items across ${vendors.length} vendors!`);
  process.exit(0);
}

run();
