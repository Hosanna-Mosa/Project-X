import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  orderId: string;
  senderId: string;
  role: string;
  text: string;
  time: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    orderId: { type: String, required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    text: { type: String, required: true },
    time: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
