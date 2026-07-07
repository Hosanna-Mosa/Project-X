import mongoose, { Schema, Document } from "mongoose";

export interface IAppVersion extends Document {
  platform: string; // "android" | "ios"
  latest: string; // e.g., "1.2.0"
  minRequired: string; // e.g., "1.1.0"
  storeUrl: string; // Redirect link to Google Play Store / Apple App Store
  createdAt: Date;
  updatedAt: Date;
}

const AppVersionSchema: Schema = new Schema(
  {
    platform: { type: String, required: true, unique: true, enum: ["android", "ios"] },
    latest: { type: String, required: true },
    minRequired: { type: String, required: true },
    storeUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAppVersion>("AppVersion", AppVersionSchema);
