import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

const bannerSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
  targetUrl: String,
  itemType: { type: String, enum: ['banner', 'ad'], default: 'banner' },
  position: { type: String, enum: ['hero', 'startup', 'below_greetings', 'driver_dashboard', 'inline'], default: 'hero' },
  isActive: { type: Boolean, default: true },
});

const Banner = mongoose.models.Banner || mongoose.model("Banner", bannerSchema);

const banners = [
  // 4 Hero Banners
  {
    title: "Craving something delicious?",
    description: "Good food, good mood!",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    itemType: "banner",
    position: "hero",
    isActive: true,
  },
  {
    title: "Need a helping hand today?",
    description: "We get your chores done!",
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
    itemType: "banner",
    position: "hero",
    isActive: true,
  },
  {
    title: "Going somewhere?",
    description: "Book a comfortable ride now!",
    imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800",
    itemType: "banner",
    position: "hero",
    isActive: true,
  },
  {
    title: "Fresh Meat Daily!",
    description: "High quality cuts delivered.",
    imageUrl: "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800",
    itemType: "banner",
    position: "hero",
    isActive: true,
  },
  // 3 Ads
  {
    title: "Welcome to Project-X!",
    description: "Enjoy your first order with free delivery.",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
    itemType: "ad",
    position: "startup",
    isActive: true,
  },
  {
    title: "Special Weekend Offer",
    description: "Get 20% off on all restaurants near you.",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
    itemType: "ad",
    position: "below_greetings",
    isActive: true,
  },
  {
    title: "Earn More Today!",
    description: "Complete 5 rides and get a bonus of $20.",
    imageUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
    itemType: "ad",
    position: "driver_dashboard",
    isActive: true,
  }
];

const seedBanners = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log("Connected to MongoDB.");

    await Banner.deleteMany({});
    console.log("Cleared existing banners.");

    await Banner.insertMany(banners);
    console.log("Seeded 4 Hero Banners and 3 Ads successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding banners:", error);
    process.exit(1);
  }
};

seedBanners();
