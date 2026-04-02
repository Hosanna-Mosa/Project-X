import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
  USER = "USER",
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
}

export interface IUser extends Document {
  name: string;
  phone: string;
  role: UserRole;
  defaultLocation?: {
    type: string;
    coordinates: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
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
  },
  { timestamps: true }
);

UserSchema.index({ defaultLocation: "2dsphere" });

export default mongoose.model<IUser>("User", UserSchema);
