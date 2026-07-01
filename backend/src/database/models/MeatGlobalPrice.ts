import mongoose, { Schema, Document } from "mongoose";

export interface IMeatGlobalPrice extends Document {
  name: string;
  weight: string;
  price: number;
  category: "Chicken" | "Mutton";
}

const MeatGlobalPriceSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    weight: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, enum: ["Chicken", "Mutton"], required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMeatGlobalPrice>("MeatGlobalPrice", MeatGlobalPriceSchema);
