import mongoose from "mongoose";
import Order, { ServiceType, StopType, OrderStatus } from "../database/models/Order";
import User, { UserRole } from "../database/models/User";
import Vendor from "../database/models/Vendor";
import Driver from "../database/models/Driver";
import { InvoiceService } from "../services/invoice.service";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/projectx";

async function main() {
  console.log("Connecting to MongoDB at:", MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    // 1. Find or create user with the target email address
    const targetEmail = "hosannamosa4190@gmail.com";
    let user = await User.findOne({ email: targetEmail });
    if (!user) {
      user = await User.create({
        name: "Suman SB",
        email: targetEmail,
        phone: "+91 9876543210",
        role: UserRole.USER,
        addresses: [{
          label: "Home",
          addressLine: "Unit 1106, TOWER-1, Gachibowli Cir, Telecom Nagar, Gachibowli, Hyderabad, Telangana 500081, India",
          phone: "+91 9876543210",
          location: { type: "Point", coordinates: [78.3498, 17.4483] }
        }]
      });
      console.log(`Created mock user with email: ${targetEmail}`);
    } else {
      console.log(`Found existing user with email: ${targetEmail}`);
    }

    // 2. Find or create vendor
    let vendor = await Vendor.findOne({ name: "Rayalaseema Ruchulu" });
    if (!vendor) {
      vendor = await Vendor.create({
        name: "Rayalaseema Ruchulu",
        email: "rayalaseema@ruchulu.com",
        phone: "+91 8888888888",
        address: "22, Sector 1, Huda Techno Enclave, Above Axis Bank, Hitech City, Hyderabad, Telangana-500081",
        legal: {
          fssaiNumber: "13619013001824",
          gstin: "36AAWCA9693G1ZS"
        },
        location: { type: "Point", coordinates: [78.3814, 17.4436] }
      });
      console.log("Created mock vendor");
    }

    // 3. Find or create driver user and driver
    let driverUser = await User.findOne({ email: "driver@flavour.com" });
    if (!driverUser) {
      driverUser = await User.create({
        name: "Dinesh Nidadavolu",
        email: "driver@flavour.com",
        phone: "+91 7777777777",
        role: UserRole.DRIVER,
      });
    }

    let driver = await Driver.findOne({ user: driverUser._id });
    if (!driver) {
      driver = await Driver.create({
        user: driverUser._id,
        vehicleType: "bike",
      });
      console.log("Created mock driver");
    }

    // 4. Create mock order in the database so the service can query it
    const testOrderId = "222972423858594";
    // Check if order already exists, delete if it does to start fresh
    await Order.deleteOne({ _id: testOrderId });

    const orderDoc = await Order.create({
      _id: testOrderId,
      user: user._id,
      driver: driver._id,
      status: OrderStatus.COMPLETED,
      serviceType: ServiceType.BIKE,
      totalDistance: 0.39,
      duration: 1.98,
      totalPrice: 20.00,
      stops: [
        {
          sequence: 1,
          type: StopType.PICKUP,
          address: "RK Beach, Beach Road, Visakhapatnam, Andhra Pradesh, India",
          location: { type: "Point", coordinates: [83.3218, 17.7121] }
        },
        {
          sequence: 2,
          type: StopType.DROP,
          address: "15-3-17, Krishna Nagar, Maharani Peta, Visakhapatnam, Andhra Pradesh 530002, India",
          location: { type: "Point", coordinates: [83.3087, 17.7024] }
        }
      ]
    });
    console.log("Created test order in database");

    // 5. Trigger sendInvoice
    console.log(`Triggering sendInvoice for Order ID: ${testOrderId} to: ${targetEmail}`);
    const result = await InvoiceService.getInstance().sendInvoice(testOrderId);
    console.log("Invoice sending result:", result);

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
