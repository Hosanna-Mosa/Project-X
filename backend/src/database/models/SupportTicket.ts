import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage {
  sender: "user" | "admin" | "system";
  time: string;
  text: string;
}

export interface ISupportTicket extends Document {
  ticketId: string;
  title: string;
  category: string;
  status: "OPEN" | "RESOLVED";
  message: string;
  user: string;
  time: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema: Schema = new Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN" },
    message: { type: String, required: true },
    user: { type: String, required: true },
    time: { type: String, required: true },
    messages: [
      {
        sender: { type: String, enum: ["user", "admin", "system"], required: true },
        time: { type: String, required: true },
        text: { type: String, required: true }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
