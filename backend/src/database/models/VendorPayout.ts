import mongoose, { Document, Schema } from "mongoose";

export enum VendorPayoutStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  PROCESSED = "processed",
  FAILED = "failed",
}

export interface IVendorPayout extends Document {
  vendor: mongoose.Types.ObjectId;
  amount: number;
  status: VendorPayoutStatus;
  razorpayContactId?: string;
  razorpayFundAccountId?: string;
  razorpayPayoutId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorPayoutSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(VendorPayoutStatus),
      default: VendorPayoutStatus.PENDING,
    },
    razorpayContactId: { type: String },
    razorpayFundAccountId: { type: String },
    razorpayPayoutId: { type: String },
    failureReason: { type: String },
  },
  { timestamps: true },
);

VendorPayoutSchema.index({ vendor: 1, createdAt: -1 });

export default mongoose.model<IVendorPayout>("VendorPayout", VendorPayoutSchema);
