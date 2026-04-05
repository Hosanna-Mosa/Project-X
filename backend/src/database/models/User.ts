import mongoose, { Schema, Document, Types } from "mongoose";

export enum UserRole {
  USER = "USER",
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
}

export interface IAddress {
  _id?: any;
  label: string; // Home, Work, etc.
  addressLine: string;
  phone: string;
  location: {
    type: string;
    coordinates: number[];
  };
}

export interface IUser extends Document {
  name: string;
  username?: string;
  email?: string;
  phone: string;
  profilePic?: string;
  role: UserRole;
  defaultLocation?: {
    type: string;
    coordinates: number[];
  };
  addresses: IAddress[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    profilePic: { type: String },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    defaultLocation: {
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
    addresses: [
      {
        label: { type: String, required: true },
        addressLine: { type: String, required: true },
        phone: { type: String, required: true },
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
      },
    ],
  },
  { timestamps: true }
);

UserSchema.index({ defaultLocation: "2dsphere" });
UserSchema.index({ "addresses.location": "2dsphere" });

export default mongoose.model<IUser>("User", UserSchema);

