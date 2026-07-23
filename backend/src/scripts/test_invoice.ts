import mongoose from "mongoose";
import * as path from "path";
import * as fs from "fs";
import Order, { ServiceType, StopType } from "../database/models/Order";
import User, { UserRole } from "../database/models/User";
import Vendor from "../database/models/Vendor";
import Driver from "../database/models/Driver";
import { InvoiceService } from "../services/invoice.service";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/projectx";

async function main() {
  console.log("Connecting to MongoDB at:", MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    // 1. Create mock User, Vendor, Driver if not exists
    let user = await User.findOne({ email: "tester@flavour.com" });
    if (!user) {
      user = await User.create({
        name: "Suman SB",
        email: "tester@flavour.com",
        phone: "+91 9876543210",
        role: UserRole.USER,
        addresses: [{
          label: "Home",
          addressLine: "Unit 1106, TOWER-1, Gachibowli Cir, Telecom Nagar, Gachibowli, Hyderabad, Telangana 500081, India",
          phone: "+91 9876543210",
          location: { type: "Point", coordinates: [78.3498, 17.4483] }
        }]
      });
      console.log("Created mock user");
    }

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

    let driverUser = await User.findOne({ email: "driver@flavour.com" });
    if (!driverUser) {
      driverUser = await User.create({
        name: "Dinesh Nidadavolu",
        email: "driver@flavour.com",
        phone: "+91 7777777777",
        role: UserRole.DRIVER,
      });
      console.log("Created mock driver user");
    }

    let driver = await Driver.findOne({ user: driverUser._id });
    if (!driver) {
      driver = await Driver.create({
        user: driverUser._id,
        vehicleType: "bike",
      });
      console.log("Created mock driver");
    }

    // 2. Generate Food Delivery Invoice
    const deliveryOrder = {
      _id: "222972423858594",
      createdAt: new Date("2025-11-24T20:30:00"),
      paymentMethod: "Online (Razorpay)",
      totalPrice: 998.76,
      serviceType: ServiceType.DELIVERY,
      user,
      vendor,
      driver: { ...driver.toObject(), user: driverUser.toObject() },
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
    };

    console.log("Compiling delivery invoice html...");
    const deliveryHtml = InvoiceService.getInstance().generateDeliveryInvoiceHtml(deliveryOrder);
    
    // Save to root backend folder
    const deliveryHtmlPath = path.join(__dirname, "../../compiled_delivery_invoice.html");
    fs.writeFileSync(deliveryHtmlPath, deliveryHtml);
    console.log("Saved compiled delivery invoice to:", deliveryHtmlPath);

    // 3. Generate Ride Share Invoice
    const rideOrder = {
      _id: "RD17808812185935874",
      createdAt: new Date("2026-06-08T06:49:00"),
      paymentMethod: "Cash",
      totalPrice: 20.00,
      totalDistance: 0.39,
      duration: 1.98,
      serviceType: ServiceType.BIKE,
      user,
      driver: { ...driver.toObject(), user: driverUser.toObject() },
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
    };

    console.log("Compiling ride invoice html...");
    const rideHtml = InvoiceService.getInstance().generateRideInvoiceHtml(rideOrder);
    
    // Save to root backend folder
    const rideHtmlPath = path.join(__dirname, "../../compiled_ride_invoice.html");
    fs.writeFileSync(rideHtmlPath, rideHtml);
    console.log("Saved compiled ride invoice to:", rideHtmlPath);

    console.log("Invoice generation test complete!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
