import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const bannerSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
  targetUrl: String,
  itemType: { type: String, enum: ['banner', 'ad'], default: 'banner' },
  position: { type: String, enum: ['hero', 'startup', 'below_greetings', 'driver_dashboard', 'inline'], default: 'hero' },
  isActive: { type: Boolean, default: true },
  color1: String,
  color2: String,
});

const Banner = mongoose.models.Banner || mongoose.model("Banner", bannerSchema);

const generateBanners = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log("Connected to MongoDB.");

    console.log("Uploading images to Cloudinary...");
    // Upload local images
    const foodRes = await cloudinary.uploader.upload(String.raw`C:\Users\mahid\.gemini\antigravity-ide\brain\99ff266a-bcaa-4e05-893d-c459b5ee2321\hero_food_banner_1784994816504.png`);
    const tasksRes = await cloudinary.uploader.upload(String.raw`C:\Users\mahid\.gemini\antigravity-ide\brain\99ff266a-bcaa-4e05-893d-c459b5ee2321\hero_tasks_banner_1784994827522.png`);
    const ridesRes = await cloudinary.uploader.upload(String.raw`C:\Users\mahid\.gemini\antigravity-ide\brain\99ff266a-bcaa-4e05-893d-c459b5ee2321\hero_rides_banner_1784994844142.png`);
    const meatRes = await cloudinary.uploader.upload(String.raw`C:\Users\mahid\.gemini\antigravity-ide\brain\99ff266a-bcaa-4e05-893d-c459b5ee2321\hero_meat_banner_1784994854467.png`);

    console.log("Images uploaded successfully.");

    const banners = [
      // 4 Hero Banners
      {
        title: "Craving something delicious?",
        description: "Good food, good mood!",
        imageUrl: foodRes.secure_url,
        itemType: "banner",
        position: "hero",
        isActive: true,
        // Default color for the first one as requested
        color1: "#4C1D95",
        color2: "#2E1065",
      },
      {
        title: "Need a helping hand today?",
        description: "We get your chores done!",
        imageUrl: tasksRes.secure_url,
        itemType: "banner",
        position: "hero",
        isActive: true,
        // Nice teal/emerald gradient
        color1: "#0F766E",
        color2: "#042F2E",
      },
      {
        title: "Going somewhere?",
        description: "Book a comfortable ride now!",
        imageUrl: ridesRes.secure_url,
        itemType: "banner",
        position: "hero",
        isActive: true,
        // Nice orange/red gradient
        color1: "#C2410C",
        color2: "#7F1D1D",
      },
      {
        title: "Fresh Meat Daily!",
        description: "High quality cuts delivered.",
        imageUrl: meatRes.secure_url,
        itemType: "banner",
        position: "hero",
        isActive: true,
        // Nice dark red/rose gradient
        color1: "#9F1239",
        color2: "#4C0519",
      },
      // Keep the 3 Ads from before
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

    await Banner.deleteMany({});
    console.log("Cleared existing banners.");

    await Banner.insertMany(banners);
    console.log("Seeded 4 Colored Hero Banners and 3 Ads successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding banners:", error);
    process.exit(1);
  }
};

generateBanners();
