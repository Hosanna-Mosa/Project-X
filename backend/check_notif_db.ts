import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { connectDB } from "./src/database/db";
import Notification from "./src/database/models/Notification";
import User from "./src/database/models/User";

dotenv.config();

async function run() {
  await connectDB();
  
  // Force register models by referencing them
  const _userModel = User;
  const _notifModel = Notification;

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const notifications = await Notification.find({
    createdAt: { $gte: fifteenMinsAgo }
  }).populate("user");

  console.log(`\nNotifications created in the last 15 minutes (${notifications.length}):`);
  for (const n of notifications) {
    const u = n.user as any;
    console.log(`- Time: ${n.createdAt.toISOString()}`);
    console.log(`  To: ${u?.name || "N/A"} (${u?._id || "N/A"}, Role: ${u?.role || "N/A"})`);
    console.log(`  Title: "${n.title}"`);
    console.log(`  Body: "${n.body}"`);
    console.log(`  Category: "${n.category}"`);
    console.log(`  IsRead: ${n.isRead}`);
  }

  await mongoose.connection.close();
}

run();
