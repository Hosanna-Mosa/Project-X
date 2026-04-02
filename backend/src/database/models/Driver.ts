import mongoose, { Schema, Document } from "mongoose";

export enum DriverStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
}

export interface IDriver extends Document {
  user: mongoose.Types.ObjectId;
  status: DriverStatus;
  isAvailable: boolean;
  currentLocation?: {
    type: string;
    coordinates: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(DriverStatus),
      default: DriverStatus.OFFLINE,
    },
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

DriverSchema.index({ currentLocation: "2dsphere" });

export default mongoose.model<IDriver>("Driver", DriverSchema);
