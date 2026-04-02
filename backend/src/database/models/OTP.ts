import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  phone: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const OTPSchema: Schema = new Schema(
  {
    phone: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OTPSchema.index({ phone: 1, code: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-expire documents

export default mongoose.model<IOTP>("OTP", OTPSchema);
