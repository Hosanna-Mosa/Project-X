import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import MeatCenter from "./src/database/models/MeatCenter";
import MeatItem from "./src/database/models/MeatItem";
import MeatGlobalPrice from "./src/database/models/MeatGlobalPrice";

dotenv.config({ path: path.join(__dirname, ".env") });

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/project-x";

const DEFAULT_MEAT_ITEMS = [
  { name: "Chicken 250g", weight: "250g", price: 60, category: "Chicken" as const },
  { name: "Chicken 500g", weight: "500g", price: 120, category: "Chicken" as const },
  { name: "Full Chicken", weight: "Full", price: 240, category: "Chicken" as const },
  { name: "Chicken Round Figure", weight: "₹100 Pack", price: 100, category: "Chicken" as const },
  { name: "Mutton 500g", weight: "500g", price: 400, category: "Mutton" as const },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB at " + MONGO_URI);

    const email = "meat.taj@example.com";
    const phone = "9876543220";

    // Delete existing center and items
    const existingCenter = await MeatCenter.findOne({ $or: [{ email }, { phone }] });
    if (existingCenter) {
      await MeatItem.deleteMany({ meatCenterId: existingCenter._id });
      await MeatCenter.deleteOne({ _id: existingCenter._id });
    }

    const meatCenter = new MeatCenter({
      name: "Taj Mahal Hotel (Veg) - Danavaipeta", // Matches name in first screenshot welcome msg
      email,
      phone,
      password: "password123", // Will be hashed automatically by pre-save hook
      location: {
        type: "Point",
        coordinates: [81.8040, 17.0005] // Rajahmundry
      },
      address: "Danavaipeta, Rajamahendravaram",
      image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80",
      rating: 4.8,
      reviews: "150+",
      categories: ["Chicken", "Mutton"],
      isOpen: true,
      deliveryFee: 30,
      minOrderValue: 100
    });

    await meatCenter.save();
    console.log("Successfully seeded Meat Center: " + meatCenter.name);

    // Get current global prices from master list or insert defaults
    let masterPrices = await MeatGlobalPrice.find();
    if (masterPrices.length === 0) {
      masterPrices = (await MeatGlobalPrice.insertMany(DEFAULT_MEAT_ITEMS)) as any;
    }

    // Populate center's meat inventory items
    const menuItems = masterPrices.map(item => ({
      meatCenterId: meatCenter._id,
      name: item.name,
      weight: item.weight,
      price: item.price,
      category: item.category,
      isGlobalItem: true,
      isOpen: true // item available by default
    }));

    await MeatItem.insertMany(menuItems);
    console.log("Seeded " + menuItems.length + " meat items for this center!");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
