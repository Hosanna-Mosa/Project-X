import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IVendor extends Document {
  name: string;
  email: string;
  phone: string;
  password?: string;
  googlePlaceId?: string;
  location: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  address: string;
  image: string;
  rating: number;
  reviews: string;
  categories: string[];
  isPureVeg: boolean;
  isOpen: boolean;
  deliveryFee: number;
  minOrderValue: number;
  createdAt: Date;
  updatedAt: Date;
  matchPassword: (password: string) => Promise<boolean>;
}

const VendorSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String },
    googlePlaceId: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    address: { type: String, required: true },
    image: { type: String },
    rating: { type: Number, default: 0 },
    reviews: { type: String, default: "0" },
    categories: { type: [String], default: [] },
    isPureVeg: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    deliveryFee: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hash password before saving
VendorSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Match password
VendorSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password as string);
};

// Crucial for proximity sorting
VendorSchema.index({ location: "2dsphere" });

export default mongoose.model<IVendor>("Vendor", VendorSchema);
