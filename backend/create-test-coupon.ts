import mongoose from "mongoose";
import dotenv from "dotenv";
import Coupon from "./src/database/models/Coupon";

dotenv.config();

const run = async () => {
  try {
    const dbUri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/projectx";
    await mongoose.connect(dbUri);
    console.log(`Connected to MongoDB at ${dbUri}`);

    // Check if test coupon exists
    let coupon = await Coupon.findOne({ code: "SAVE20" });
    if (!coupon) {
      coupon = new Coupon({
        code: "SAVE20",
        discountType: "PERCENTAGE",
        discountValue: 20,
        maxDiscount: 50,
        minOrderValue: 10,
        isActive: true,
      });
      await coupon.save();
      console.log("Created coupon SAVE20 (20% off, max ₹50)");
    } else {
      console.log("Coupon SAVE20 already exists");
    }
    
    let flatCoupon = await Coupon.findOne({ code: "FLAT10" });
    if (!flatCoupon) {
      flatCoupon = new Coupon({
        code: "FLAT10",
        discountType: "FLAT",
        discountValue: 10,
        minOrderValue: 0,
        isActive: true,
      });
      await flatCoupon.save();
      console.log("Created coupon FLAT10 (₹10 flat off)");
    } else {
      console.log("Coupon FLAT10 already exists");
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
