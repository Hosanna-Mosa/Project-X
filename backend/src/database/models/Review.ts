import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  order: string;
  user: mongoose.Types.ObjectId;
  vendor?: mongoose.Types.ObjectId;
  driver?: mongoose.Types.ObjectId;
  rating: number;
  driverRating?: number;
  vendorRating?: number;
  comment?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    order: { type: String, ref: "Order", required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor" },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    driverRating: { type: Number, min: 1, max: 5 },
    vendorRating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: "" },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IReview>("Review", ReviewSchema);
