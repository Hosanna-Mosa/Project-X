import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  description?: string;
  imageUrl: string;
  targetUrl?: string;
  itemType: string;
  position: string;
  isActive: boolean;
  displayOrder: number;
  color1?: string;
  color2?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    targetUrl: {
      type: String,
    },
    itemType: {
      type: String,
      enum: ['banner', 'ad'],
      default: 'banner',
    },
    position: {
      type: String,
      enum: ['hero', 'startup', 'below_greetings', 'driver_dashboard', 'inline'],
      default: 'hero',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    color1: {
      type: String,
    },
    color2: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Banner = mongoose.model<IBanner>('Banner', bannerSchema);

export default Banner;
