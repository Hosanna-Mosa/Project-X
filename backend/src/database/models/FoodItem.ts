import mongoose, { Schema, Document } from "mongoose";

export interface IFoodItem extends Document {
  vendorId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  isAvailable: boolean;
  isVeg: boolean;
}

const FoodItemSchema: Schema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    images: { type: [String], default: [] },
    category: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IFoodItem>("FoodItem", FoodItemSchema);
