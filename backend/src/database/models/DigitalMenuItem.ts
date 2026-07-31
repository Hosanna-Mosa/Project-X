import mongoose, { Schema, Document } from "mongoose";

export interface IDigitalMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
}

const DigitalMenuItemSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "DigitalMenuRestaurant", required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    images: { type: [String], default: [] },
    category: { type: String, required: true },
    isVeg: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDigitalMenuItem>("DigitalMenuItem", DigitalMenuItemSchema);
