import mongoose, { Document, Schema } from "mongoose";

export enum DriverPayoutStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  PROCESSED = "processed",
  FAILED = "failed",
}

export interface IDriverPayout extends Document {
  driver: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  status: DriverPayoutStatus;
  razorpayContactId?: string;
  razorpayFundAccountId?: string;
  razorpayPayoutId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriverPayoutSchema = new Schema(
  {
    driver: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(DriverPayoutStatus),
      default: DriverPayoutStatus.PENDING,
    },
    razorpayContactId: { type: String },
    razorpayFundAccountId: { type: String },
    razorpayPayoutId: { type: String },
    failureReason: { type: String },
  },
  { timestamps: true },
);

DriverPayoutSchema.index({ driver: 1, createdAt: -1 });

export default mongoose.model<IDriverPayout>("DriverPayout", DriverPayoutSchema);
