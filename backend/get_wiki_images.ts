import https from "https";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "./src/database/models/Vendor";
import FoodItem from "./src/database/models/FoodItem";

dotenv.config();

function fetchWikiImage(topic: string): Promise<string | null> {
  return new Promise((resolve) => {
    https.get(`https://en.wikipedia.org/wiki/${topic}`, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
         if (res.headers.location) {
             https.get(`https://en.wikipedia.org${res.headers.location}`, { headers: { "User-Agent": "Mozilla/5.0" } }, (res2) => {
                 let data = "";
                 res2.on("data", chunk => data += chunk);
                 res2.on("end", () => {
                   const match = data.match(/<meta property="og:image" content="(.*?)"/);
                   if (match && match[1]) resolve(match[1]);
                   else resolve(null);
                 });
             }).on("error", () => resolve(null));
         } else resolve(null);
         return;
      }
      
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const match = data.match(/<meta property="og:image" content="(.*?)"/);
        if (match && match[1]) {
          resolve(match[1]);
        } else {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

async function run() {
  await mongoose.connect(process.env.DATABASE_URL || "");

  const imageMap: Record<string, string> = {
    dosa: await fetchWikiImage("Dosa") || "",
    idli: await fetchWikiImage("Idli") || "",
    vada: await fetchWikiImage("Vada_(food)") || "",
    uttapam: await fetchWikiImage("Uttapam") || "",
    upma: await fetchWikiImage("Upma") || "",
    rice: await fetchWikiImage("Lemon_rice") || "",
    paneer: await fetchWikiImage("Paneer") || "",
    naan: await fetchWikiImage("Naan") || "",
    momos: await fetchWikiImage("Momo_(food)") || "",
    sweet: await fetchWikiImage("Gulab_jamun") || ""
  };
  
  console.log("Found Wiki Images:", imageMap);

  const vendor = await Vendor.findOne({ name: /Sai Ram Tiffin Center/i });
  if (!vendor) return process.exit(1);

  const items = await FoodItem.find({ vendorId: vendor._id });
  let count = 0;

  for (const item of items) {
    const name = item.name.toLowerCase();
    let key = "paneer";
    if (name.includes("dosa") || name.includes("pesarattu")) key = "dosa";
    else if (name.includes("idli")) key = "idli";
    else if (name.includes("vada") || name.includes("wada")) key = "vada";
    else if (name.includes("uttapam") || name.includes("uthappam")) key = "uttapam";
    else if (name.includes("upma") || name.includes("pongal") || name.includes("poha") || name.includes("khichdi")) key = "upma";
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
  
  console.log(`Updated ${count} items!`);
  process.exit(0);
}

run();
