import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export enum UserRole {
  USER = "USER",
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
}

export interface IUserMethods {
  matchPassword: (password: string) => Promise<boolean>;
}

export interface IAddress {
  _id?: any;
  label: string; // Home, Work, etc.
  receiverName?: string;
  addressLine: string;
  phone: string;
  location: {
    type: string;
    coordinates: number[];
  };
}

export interface IBookingPreference {
  type: "myself" | "someone_else";
  contactNumber?: string;
  updatedAt?: Date;
}

export interface IUser extends Document, IUserMethods {
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
  bookingPreference?: IBookingPreference;
  password?: string;
  favorites?: Types.ObjectId[];
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
        receiverName: { type: String },
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
    bookingPreference: {
      type: {
        type: String,
        enum: ["myself", "someone_else"],
        default: "myself",
      },
      contactNumber: { type: String },
      updatedAt: { type: Date },
    },
    password: { type: String },
    favorites: [{ type: Schema.Types.ObjectId, ref: "Vendor", default: [] }],
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function () {
  // `this` is a mongoose document
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Match password
UserSchema.methods.matchPassword = async function (password: string) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

UserSchema.index({ defaultLocation: "2dsphere" });
UserSchema.index({ "addresses.location": "2dsphere" });

export default mongoose.model<IUser>("User", UserSchema);


