import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

const bannerSchema = new mongoose.Schema({
  title: String,
  displayOrder: Number,
}, { strict: false });

const Banner = mongoose.models.Banner || mongoose.model("Banner", bannerSchema);

const updateOrders = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log("Connected to MongoDB.");

    const banners = await Banner.find({ itemType: 'banner', position: 'hero' });
    let order = 1;
    for (const banner of banners) {
      banner.displayOrder = order;
      await banner.save();
      console.log(`Updated ${banner.title} to order ${order}`);
      order++;
    }

    console.log("Updated existing hero banners with display orders successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Error updating banner orders:", error);
    process.exit(1);
  }
};

updateOrders();
