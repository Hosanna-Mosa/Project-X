import mongoose, { Schema, Document } from "mongoose";

export interface ISystemConfig extends Document {
  key: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);
