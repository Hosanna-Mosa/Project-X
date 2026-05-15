import mongoose, { Schema, Document } from "mongoose";

export interface IMeatItem extends Document {
  meatCenterId: mongoose.Types.ObjectId;
  name: string;
  weight: string; // e.g. "250g", "500g", "Full"
  price: number;
  image?: string;
  category: "Chicken" | "Mutton";
  isAvailable: boolean;
  isGlobalItem: boolean; // True for the standard 5 items
}

const MeatItemSchema: Schema = new Schema(
  {
    meatCenterId: { type: Schema.Types.ObjectId, ref: "MeatCenter", required: true },
    name: { type: String, required: true },
    weight: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    category: { type: String, enum: ["Chicken", "Mutton"], default: "Chicken" },
    isAvailable: { type: Boolean, default: true },
    isGlobalItem: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMeatItem>("MeatItem", MeatItemSchema);
