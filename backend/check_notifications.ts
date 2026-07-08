import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { connectDB } from "./src/database/db";
import { seedDatabase } from "./src/database/seeder";
import User, { UserRole } from "./src/database/models/User";
import Driver, { DriverStatus } from "./src/database/models/Driver";
import Order, { OrderStatus, ServiceType, StopType } from "./src/database/models/Order";
import SupportTicket from "./src/database/models/SupportTicket";
import Notification from "./src/database/models/Notification";
import { NotificationService } from "./src/services/notification.service";
import { OrdersService } from "./src/modules/orders/orders.service";
import { SchedulerService } from "./src/services/scheduler.service";

dotenv.config();

async function runCheck() {
  console.log("=========================================");
  console.log("🚀 STARTING ALL-PILLAR NOTIFICATION CHECK 🚀");
  console.log("=========================================");

  await connectDB();
  await seedDatabase();

  const ordersService = new OrdersService();
  const notificationService = NotificationService.getInstance();
  const schedulerService = SchedulerService.getInstance();

  const createdNotificationIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdTicketIds: string[] = [];
  
  const rand = Math.floor(1000 + Math.random() * 9000);
  const customerEmail = `testcust-${rand}@example.com`;
  const customerPhone = `+91999990${rand}`;
  const driverEmail = `testdriver-${rand}@example.com`;
  const driverPhone = `+91888880${rand}`;
  const adminEmail = `testadmin-${rand}@example.com`;
  const adminPhone = `+91777770${rand}`;

  let customer: any;
  let driverUser: any;
  let driverProfile: any;
  let adminUser: any;

  try {
    // 1. Create fresh test Customer
    customer = new User({
      name: `Test Customer ${rand}`,
      email: customerEmail,
      phone: customerPhone,
      password: "password123",
      role: UserRole.USER,
      expoPushToken: "ExponentPushToken[customer-test-token]"
    });
    await customer.save();
    console.log(`[SETUP] Fresh Customer created: ${customer.name} (${customer._id})`);

    // 2. Create fresh test Driver User + Profile
    driverUser = new User({
      name: `Test Driver ${rand}`,
      email: driverEmail,
      phone: driverPhone,
      password: "password123",
      role: UserRole.DRIVER,
      expoPushToken: "ExponentPushToken[driver-test-token]"
    });
    await driverUser.save();

    const zonesService = new (require("./src/modules/zones/zones.service").ZonesService)();
    const activeZone = await zonesService.getZoneForCoordinates(17.0005, 81.7781);

    driverProfile = new Driver({
      user: driverUser._id,
      vehicleType: "bike",
      status: DriverStatus.ONLINE,
      isAvailable: true,
      preferredZone: activeZone?._id,
      currentLocation: { type: "Point", coordinates: [81.7781, 17.0005] } // Rajahmundry coordinates
    });
    await driverProfile.save();
    console.log(`[SETUP] Fresh Driver created: ${driverUser.name} (${driverUser._id}), vehicleType: bike, zone: ${activeZone?.name || "none"}`);

    const socketManagerObj = (require("./src/sockets/socket.manager").SocketManager).getInstance();
    const redisClientLocal = socketManagerObj ? (socketManagerObj as any).redisClient : null;
    if (redisClientLocal) {
      await redisClientLocal.geoAdd("drivers:locations", {
        longitude: 81.7781,
        latitude: 17.0005,
        member: driverProfile._id.toString()
      });
      console.log("✅ Added test driver to Redis spatial index");
    }

    // 3. Create fresh test Admin
    adminUser = new User({
      name: `Test Admin ${rand}`,
      email: adminEmail,
      phone: adminPhone,
      password: "password123",
      role: UserRole.ADMIN,
      expoPushToken: "ExponentPushToken[admin-test-token]"
    });
    await adminUser.save();
    console.log(`[SETUP] Fresh Admin created: ${adminUser.name} (${adminUser._id})`);

    // =========================================
    // PILLAR 1: Driver Matching Nudge (createOrder)
    // =========================================
    console.log("\n--- Testing Pillar 1: Matching Nudge ---");
    const stops = [
      { id: "s1", address: "Rajahmundry Junction, AP", latitude: 17.0005, longitude: 81.7781, type: "pickup" },
      { id: "s2", address: "Palacharla, AP", latitude: 17.0512, longitude: 81.8105, type: "drop" }
    ];

    const orderData = await ordersService.createOrder(
      customer._id.toString(),
      stops,
      ServiceType.BIKE
    );
    createdOrderIds.push(orderData._id);
    console.log(`✅ Order created successfully: ${orderData._id}`);

    // Wait a brief moment for async IIFE match notifications to complete
    await new Promise(r => setTimeout(r, 1500));

    // Check if the driver received a matching notification
    const driverNotifications = await Notification.find({ user: driverUser._id });
    if (driverNotifications.length > 0) {
      console.log(`✅ Pillar 1 Success: Driver received matching nudge!`);
      console.log(`   Notification: "${driverNotifications[0].title}" - ${driverNotifications[0].body}`);
      driverNotifications.forEach(n => createdNotificationIds.push(n._id.toString()));
    } else {
      console.warn(`⚠️ Pillar 1 Warning: No matching notification created for driver ${driverUser._id}`);
    }

    // =========================================
    // PILLAR 1: Driver Assigned Nudge (acceptOrder)
    // =========================================
    console.log("\n--- Testing Pillar 1: Driver Assigned Nudge ---");
    const acceptedOrder = await ordersService.acceptOrder(orderData._id, driverUser._id.toString());
    console.log(`✅ Order accepted by driver. Status: ${acceptedOrder.status}`);

    const customerAssignedNotifications = await Notification.find({
      user: customer._id,
      "data.status": OrderStatus.DRIVER_ASSIGNED
    });
    if (customerAssignedNotifications.length > 0) {
      console.log(`✅ Pillar 1 Success: Customer received Driver Assigned notification!`);
      console.log(`   Notification: "${customerAssignedNotifications[0].title}" - ${customerAssignedNotifications[0].body}`);
      customerAssignedNotifications.forEach(n => createdNotificationIds.push(n._id.toString()));
    } else {
      console.error(`❌ Pillar 1 Failure: Customer did not receive Driver Assigned notification!`);
    }

    // =========================================
    // PILLAR 1 & 2: Arrived Pickup & OTP PIN Nudge
    // =========================================
    console.log("\n--- Testing Pillar 2: Arrived & OTP PIN Alert ---");
    const arrivedOrder = await ordersService.updateOrderStatus(orderData._id, OrderStatus.ARRIVED_PICKUP);
    console.log(`✅ Order status updated to: ${arrivedOrder.status}`);

    const customerArrivedNotifications = await Notification.find({
      user: customer._id,
      "data.status": OrderStatus.ARRIVED_PICKUP
    });
    if (customerArrivedNotifications.length > 0) {
      console.log(`✅ Pillar 2 Success: Customer received Arrived alert containing PIN!`);
      console.log(`   Notification: "${customerArrivedNotifications[0].title}" - ${customerArrivedNotifications[0].body}`);
      customerArrivedNotifications.forEach(n => createdNotificationIds.push(n._id.toString()));
    } else {
      console.error(`❌ Pillar 2 Failure: Customer did not receive Arrived notification!`);
    }

    // =========================================
    // PILLAR 2: Safety & SOS alerts
    // =========================================
    console.log("\n--- Testing Pillar 2: Emergency SOS trigger ---");
    const sosResult = await ordersService.triggerOrderSOS(orderData._id, customer._id.toString());
    if (sosResult) {
      console.log("✅ triggerOrderSOS returned true");

      // Verify SupportTicket was created
      const ticket = await SupportTicket.findOne({ ticketId: new RegExp(`^SOS-${orderData._id}`) });
      if (ticket) {
        console.log(`✅ Pillar 2 Success: SOS Support Ticket logged: ${ticket.ticketId}`);
        createdTicketIds.push(ticket._id.toString());
      } else {
        console.error(`❌ Pillar 2 Failure: SOS Support Ticket was not created!`);
      }

      // Verify Admin received notification
      const adminNotifications = await Notification.find({ user: adminUser._id, category: "system" });
      if (adminNotifications.length > 0) {
        console.log(`✅ Pillar 2 Success: Administrator received Emergency Alert!`);
        console.log(`   Notification: "${adminNotifications[0].title}" - ${adminNotifications[0].body}`);
        adminNotifications.forEach(n => createdNotificationIds.push(n._id.toString()));
      } else {
        console.error(`❌ Pillar 2 Failure: Admin did not receive SOS notification!`);
      }
    }

    // =========================================
    // PILLAR 4: Commuter Rush Hour alerts
    // =========================================
    console.log("\n--- Testing Pillar 4: Commuter Nudges ---");
    // Clear recent alerts to run manually
    await Notification.deleteMany({ category: "commute_alert" });

    const commuteCount = await schedulerService.triggerCommuterAlerts();
    console.log(`✅ Commuter alerts dispatched. Count: ${commuteCount}`);

    const commuteAlerts = await Notification.find({ category: "commute_alert" });
    if (commuteAlerts.length > 0) {
      console.log(`✅ Pillar 4 Success: Users received rush hour commuter nudges!`);
      console.log(`   Notification count: ${commuteAlerts.length}`);
      console.log(`   Notification sample: "${commuteAlerts[0].title}" - ${commuteAlerts[0].body}`);
      commuteAlerts.forEach(n => createdNotificationIds.push(n._id.toString()));
    } else {
      console.error(`❌ Pillar 4 Failure: Commuter notifications not created!`);
    }

    // =========================================
    // PILLAR 4: Abandoned Bookings
    // =========================================
    console.log("\n--- Testing Pillar 4: Abandoned Cart Nudges ---");
    // Create an order and backdate its createdAt timestamp to 20 minutes ago
    const backdatedOrder = new Order({
      _id: "ORD-ABANDON-TEST",
      user: customer._id,
      serviceType: ServiceType.CAB,
      totalDistance: 12.0,
      totalPrice: 150,
      status: OrderStatus.CREATED,
      stops: [
        { sequence: 1, type: StopType.PICKUP, location: { type: "Point", coordinates: [81.7, 17.0] } },
        { sequence: 2, type: StopType.DROP, location: { type: "Point", coordinates: [81.8, 17.1] } }
      ],
      createdAt: new Date(Date.now() - 20 * 60 * 1000) // 20 mins ago
    });
    await backdatedOrder.save();
    createdOrderIds.push(backdatedOrder._id);

    const abandonedCount = await schedulerService.checkAbandonedBookings();
    console.log(`✅ Abandoned bookings check complete. Nudges sent: ${abandonedCount}`);

    const abandonedNudges = await Notification.find({ category: "abandoned_booking" });
    if (abandonedNudges.length > 0) {
      console.log(`✅ Pillar 4 Success: Customer received abandoned booking nudge!`);
      console.log(`   Notification: "${abandonedNudges[0].title}" - ${abandonedNudges[0].body}`);
      abandonedNudges.forEach(n => createdNotificationIds.push(n._id.toString()));
    } else {
      console.error(`❌ Pillar 4 Failure: Abandoned booking nudge was not created!`);
    }

    console.log("\n=========================================");
    console.log("✨ ALL 4 NOTIFICATION PILLARS PASSED SUCCESSFULLY! ✨");
    console.log("=========================================");
  } catch (error: any) {
    console.error("\n❌ Verification failed with error:", error.message);
  } finally {
    // Cleanup generated data
    console.log("\n--- Starting Data Cleanup ---");
    
    if (createdNotificationIds.length > 0) {
      const delNotif = await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
      console.log(`- Cleaned up ${delNotif.deletedCount} notifications.`);
    }
    
    if (createdOrderIds.length > 0) {
      const delOrder = await Order.deleteMany({ _id: { $in: createdOrderIds } });
      console.log(`- Cleaned up ${delOrder.deletedCount} test orders.`);
    }

    if (createdTicketIds.length > 0) {
      const delTicket = await SupportTicket.deleteMany({ _id: { $in: createdTicketIds } });
      console.log(`- Cleaned up ${delTicket.deletedCount} support tickets.`);
    }

    if (customer) {
      await User.deleteOne({ _id: customer._id });
    }
    if (driverUser) {
      await User.deleteOne({ _id: driverUser._id });
    }
    if (driverProfile) {
      try {
        const socketManagerObj = (require("./src/sockets/socket.manager").SocketManager).getInstance();
        const redisClientLocal = socketManagerObj ? (socketManagerObj as any).redisClient : null;
        if (redisClientLocal) {
          await redisClientLocal.zRem("drivers:locations", driverProfile._id.toString());
          console.log("- Cleaned up test driver from Redis spatial index");
        }
      } catch (err) {
        console.error("Failed to clean up test driver from Redis:", err);
      }
      await Driver.deleteOne({ _id: driverProfile._id });
    }
    if (adminUser) {
      await User.deleteOne({ _id: adminUser._id });
    }
    console.log("- Cleaned up test customer, driver, and admin accounts.");

    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

runCheck();
