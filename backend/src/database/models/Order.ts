import mongoose, { Schema, Document } from "mongoose";

export enum ServiceType {
  BIKE = "bike",
  AUTO = "auto",
  CAB = "cab",
  CAB_PRIME = "cab_prime",
  DELIVERY = "delivery",
  HELPER = "helper",
}

export enum OrderStatus {
  CREATED = "CREATED",
  SEARCHING_DRIVER = "SEARCHING_DRIVER",
  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
  PICKING_ITEMS = "PICKING_ITEMS",
  ON_THE_WAY = "ON_THE_WAY",
  // Ride-specific statuses
  ARRIVED_PICKUP = "ARRIVED_PICKUP",
  IN_TRANSIT = "IN_TRANSIT",
  COMPLETED = "COMPLETED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",

  // Lowercase compatibility statuses for client tracking sequence
  CONFIRMED = "confirmed",
  DRIVER_ASSIGNED_LC = "driver_assigned",
  EN_ROUTE_PICKUP = "en_route_pickup",
  ARRIVED_PICKUP_LC = "arrived_pickup",
  PICKING_ITEMS_LC = "picking_items",
  EN_ROUTE_DELIVERY = "en_route_delivery",
  ARRIVED_DELIVERY_LC = "arrived_delivery",
  DELIVERED_LC = "delivered",
}

export enum StopType {
  PICKUP = "pickup",
  DROP = "drop",
  STOP = "stop",
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
  vendor?: mongoose.Types.ObjectId;
  driver?: mongoose.Types.ObjectId;
  status: OrderStatus;
  serviceType: ServiceType;
  totalDistance: number;
  totalPrice: number;
  priceBreakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    total: number;
  };
  stops: IStop[];
  radius?: number;
  duration?: number;
  deliveryOtp?: string;
  restaurantPickupCode?: string;
  polyline?: string;
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
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor" },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CREATED,
    },
    serviceType: {
      type: String,
      enum: Object.values(ServiceType),
      default: ServiceType.CAB,
    },
    totalDistance: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    priceBreakdown: {
      baseFare: { type: Number, default: 0 },
      distanceFare: { type: Number, default: 0 },
      timeFare: { type: Number, default: 0 },
      surgeMultiplier: { type: Number, default: 1 },
      total: { type: Number, default: 0 },
    },
    stops: [StopSchema],
    radius: { type: Number },
    duration: { type: Number },
    deliveryOtp: { type: String },
    restaurantPickupCode: { type: String },
    polyline: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ "stops.location": "2dsphere" });

export default mongoose.model<IOrder>("Order", OrderSchema);
