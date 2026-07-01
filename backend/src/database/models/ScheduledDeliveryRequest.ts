import mongoose, { Schema, Document } from "mongoose";

export type ScheduledDeliveryStatus = "pending" | "accepted" | "rejected";

export interface IScheduledDeliveryRequest extends Omit<Document, "_id"> {
  requestId: string;
  customer: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  scheduledFor: Date;
  status: ScheduledDeliveryStatus;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledDeliveryRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    customerName: { type: String, default: "Customer" },
    customerPhone: { type: String, default: "" },
    scheduledFor: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    respondedAt: { type: Date },
  },
  { timestamps: true },
);

ScheduledDeliveryRequestSchema.index({ vendor: 1, status: 1, scheduledFor: 1 });
ScheduledDeliveryRequestSchema.index({ customer: 1, requestId: 1 });

export default mongoose.model<IScheduledDeliveryRequest>(
  "ScheduledDeliveryRequest",
  ScheduledDeliveryRequestSchema,
);
