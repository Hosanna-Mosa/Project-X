import mongoose, { Schema, Document } from "mongoose";

export enum OrderStatus {
  CREATED = "CREATED",
  SEARCHING_DRIVER = "SEARCHING_DRIVER",
  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
  PICKING_ITEMS = "PICKING_ITEMS",
  ON_THE_WAY = "ON_THE_WAY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum StopType {
  PICKUP = "PICKUP",
  DROP = "DROP",
}

export interface IStop {
  sequence: number;
  location: {
    type: string;
    coordinates: number[];
  };
  address?: string;
  type: StopType;
  items?: any;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  driver?: mongoose.Types.ObjectId;
  status: OrderStatus;
  totalDistance: number;
  totalPrice: number;
  stops: IStop[];
  createdAt: Date;
  updatedAt: Date;
}

const StopSchema: Schema = new Schema({
  sequence: { type: Number, required: true },
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
  address: { type: String },
  type: {
    type: String,
    enum: Object.values(StopType),
    required: true,
  },
  items: { type: Schema.Types.Mixed },
});

const OrderSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CREATED,
    },
    totalDistance: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    stops: [StopSchema],
  },
  { timestamps: true }
);

OrderSchema.index({ "stops.location": "2dsphere" });

export default mongoose.model<IOrder>("Order", OrderSchema);
