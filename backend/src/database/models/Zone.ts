import mongoose, { Schema, Document } from "mongoose";
import { ServiceType } from "./Order";

export enum ZoneType {
  CIRCLE = "circle",
  POLYGON = "polygon",
}

export interface IZone extends Document {
  name: string;
  type: ZoneType;
  pricingMultiplier: number;
  isActive: boolean;
  center?: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  radius?: number; // in meters
  boundary?: {
    type: string;
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };
  description?: string;
  allowedServices?: ServiceType[];
  activeHours?: {
    start?: string; // "HH:MM" format
    end?: string;   // "HH:MM" format
  };
  autoSurgeEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(ZoneType),
      required: true,
      default: ZoneType.POLYGON,
    },
    pricingMultiplier: { type: Number, required: true, default: 1.0 },
    isActive: { type: Boolean, required: true, default: true },
    center: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    radius: { type: Number }, // in meters
    boundary: {
      type: {
        type: String,
        enum: ["Polygon"],
      },
      coordinates: {
        type: [[[Number]]], // Array of arrays of arrays
      },
    },
    description: { type: String },
    allowedServices: {
      type: [String],
      enum: Object.values(ServiceType),
      default: [],
    },
    activeHours: {
      start: { type: String },
      end: { type: String },
    },
    autoSurgeEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for geospatial queries
ZoneSchema.index({ boundary: "2dsphere" });
ZoneSchema.index({ center: "2dsphere" });

export default mongoose.model<IZone>("Zone", ZoneSchema);
