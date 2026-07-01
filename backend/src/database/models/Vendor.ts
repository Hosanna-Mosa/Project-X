import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IVendor extends Document {
  name: string;
  email: string;
  phone: string;
  password?: string;
  googlePlaceId?: string;
  onboardingStatus?: "draft" | "submitted";
  partnerType?: "food" | "meat";
  owner?: {
    name?: string;
    email?: string;
    phone?: string;
    primaryContact?: string;
    otpVerified?: boolean;
  };
  location: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  address: string;
  detailedAddress?: {
    shopNo?: string;
    floor?: string;
    area?: string;
    city?: string;
    landmark?: string;
    formattedAddress?: string;
  };
  image: string;
  rating: number;
  reviews: string;
  categories: string[];
  operations?: {
    selectedDays?: string[];
    timeSlots?: { open: string; close: string }[];
    dayTimeSlots?: Record<string, { open: string; close: string }[]>;
    menuSetupMode?: "upload" | "manual";
    menuReferenceFileName?: string;
    menuUploadValid?: boolean;
    menuUploadRows?: {
      category: string;
      itemName: string;
      price: string;
      description?: string;
      type?: string;
      isBestseller?: string;
      imageFileName?: string;
    }[];
    menuCategories?: {
      name: string;
      items: {
        name: string;
        price: string;
        description?: string;
        isVeg: boolean;
        isBestseller: boolean;
        photoFileName?: string;
      }[];
    }[];
  };
  legal?: {
    panNumber?: string;
    panFileName?: string;
    gstin?: string;
    gstFileName?: string;
    gstExempt?: boolean;
    fssaiNumber?: string;
    fssaiExpiry?: string;
    fssaiFileName?: string;
    bankAccount?: string;
    accountType?: "savings" | "current";
    ifsc?: string;
    ifscVerified?: boolean;
    chequeFileName?: string;
  };
  contract?: {
    acceptedTos?: boolean;
    signature?: string;
    signedAt?: Date;
  };
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
    onboardingStatus: {
      type: String,
      enum: ["draft", "submitted"],
      default: "draft",
    },
    partnerType: {
      type: String,
      enum: ["food", "meat"],
      default: "food",
    },
    owner: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      primaryContact: { type: String },
      otpVerified: { type: Boolean, default: false },
    },
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
    detailedAddress: {
      shopNo: { type: String },
      floor: { type: String },
      area: { type: String },
      city: { type: String },
      landmark: { type: String },
      formattedAddress: { type: String },
    },
    image: { type: String },
    rating: { type: Number, default: 0 },
    reviews: { type: String, default: "0" },
    categories: { type: [String], default: [] },
    operations: {
      selectedDays: { type: [String], default: [] },
      timeSlots: {
        type: [
          {
            open: { type: String },
            close: { type: String },
          },
        ],
        default: [],
      },
      dayTimeSlots: { type: Schema.Types.Mixed },
      menuSetupMode: { type: String, enum: ["upload", "manual"], default: "manual" },
      menuReferenceFileName: { type: String },
      menuUploadValid: { type: Boolean, default: false },
      menuUploadRows: {
        type: [
          {
            category: { type: String },
            itemName: { type: String },
            price: { type: String },
            description: { type: String },
            type: { type: String },
            isBestseller: { type: String },
            imageFileName: { type: String },
          },
        ],
        default: [],
      },
      menuCategories: {
        type: [
          {
            name: { type: String },
            items: [
              {
                name: { type: String },
                price: { type: String },
                description: { type: String },
                isVeg: { type: Boolean },
                isBestseller: { type: Boolean },
                photoFileName: { type: String },
              },
            ],
          },
        ],
        default: [],
      },
    },
    legal: {
      panNumber: { type: String },
      panFileName: { type: String },
      gstin: { type: String },
      gstFileName: { type: String },
      gstExempt: { type: Boolean, default: false },
      fssaiNumber: { type: String },
      fssaiExpiry: { type: String },
      fssaiFileName: { type: String },
      bankAccount: { type: String },
      accountType: { type: String, enum: ["savings", "current"], default: "savings" },
      ifsc: { type: String },
      ifscVerified: { type: Boolean, default: false },
      chequeFileName: { type: String },
    },
    contract: {
      acceptedTos: { type: Boolean, default: false },
      signature: { type: String },
      signedAt: { type: Date },
    },
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
