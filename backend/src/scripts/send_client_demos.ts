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
  const targetEmail = process.argv[2];
  if (!targetEmail) {
    console.error("❌ Error: Please provide a target email address as an argument.");
    console.error("Usage: npx ts-node src/scripts/send_client_demos.ts client@example.com");
    process.exit(1);
  }

  console.log(`🚀 Starting demo dispatch to: ${targetEmail}`);
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    // 1. Find or create user with the target email address
    let user = await User.findOne({ email: targetEmail });
    if (!user) {
      user = await User.create({
        name: "Demo Customer",
        email: targetEmail,
        phone: "+91 9999999999",
        role: UserRole.USER,
        addresses: [{
          label: "Home",
          addressLine: "Unit 1106, TOWER-1, Gachibowli Cir, Telecom Nagar, Gachibowli, Hyderabad, Telangana 500081, India",
          phone: "+91 9999999999",
          location: { type: "Point", coordinates: [78.3498, 17.4483] }
        }]
      });
      console.log(`Created new customer user: ${targetEmail}`);
    } else {
      console.log(`Using existing user: ${targetEmail}`);
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
    }

    const getDemoId = (prefix: string) => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
      return `${prefix}${day}${month}${year}${random6Digits}`;
    };

    // 4. Send Food Delivery Demo
    const foodOrderId = getDemoId("F");
    await Order.create({
      _id: foodOrderId,
      user: user._id,
      vendor: vendor._id,
      driver: driver._id,
      status: OrderStatus.COMPLETED,
      serviceType: ServiceType.DELIVERY,
      totalDistance: 2.5,
      totalPrice: 998.76,
      stops: [
        {
          sequence: 1,
          type: StopType.PICKUP,
          address: "Rayalaseema Ruchulu, Hitech City",
          location: { type: "Point", coordinates: [78.3814, 17.4436] }
        },
        {
          sequence: 2,
          type: StopType.DROP,
          address: "Unit 1106, TOWER-1, Gachibowli Cir, Telecom Nagar, Gachibowli, Hyderabad, Telangana 500081, India",
          location: { type: "Point", coordinates: [78.3498, 17.4483] },
          items: {
            lines: [
              { name: "Mutton Pulao", quantity: 1, price: 599.00, total: 599.00 },
              { name: "Chilli Mushroom (dry)", quantity: 1, price: 419.00, total: 419.00 },
              { name: "Order Packing Charges", quantity: 1, price: 35.00, total: 35.00 }
            ],
            totals: {
              subtotal: 951.20,
              taxes: 47.56,
              deliveryFee: 0,
              serviceFee: 0,
              tip: 0,
              discount: 0,
              total: 998.76
            }
          }
        }
      ]
    });
    console.log("\n🍔 1. Dispatching Food Delivery demo email...");
    const foodResult = await InvoiceService.getInstance().sendInvoice(foodOrderId);
    console.log(`Food Delivery Email Sent: ${foodResult}`);

    // 5. Send Ride Share Demo
    const rideOrderId = getDemoId("R");
    await Order.create({
      _id: rideOrderId,
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
    console.log("\n🏍️ 2. Dispatching Ride Sharing demo email...");
    const rideResult = await InvoiceService.getInstance().sendInvoice(rideOrderId);
    console.log(`Ride Sharing Email Sent: ${rideResult}`);

    // 6. Send Helper Task Demo
    const taskOrderId = getDemoId("T");
    await Order.create({
      _id: taskOrderId,
      user: user._id,
      driver: driver._id,
      status: OrderStatus.COMPLETED,
      serviceType: ServiceType.HELPER,
      totalDistance: 4.80,
      duration: 3.5, // 3.5 hours
      totalPrice: 450.00,
      stops: [
        {
          sequence: 1,
          type: StopType.PICKUP,
          address: "Tech Park, Main Gate, Gachibowli, Hyderabad, Telangana, India",
          location: { type: "Point", coordinates: [78.3498, 17.4483] }
        },
        {
          sequence: 2,
          type: StopType.DROP,
          address: "Apt 4B, Hill View Residency, Gachibowli, Hyderabad, Telangana 500081, India",
          location: { type: "Point", coordinates: [78.3510, 17.4500] }
        }
      ]
    });
    console.log("\n🧹 3. Dispatching Helper Task demo email...");
    const taskResult = await InvoiceService.getInstance().sendInvoice(taskOrderId);
    console.log(`Helper Task Email Sent: ${taskResult}`);

    console.log("\n✨ Demo dispatch task complete!");

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
