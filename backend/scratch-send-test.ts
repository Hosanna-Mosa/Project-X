import * as dotenv from "dotenv";
import { NotificationService } from "./src/services/notification.service";
import { connectDB } from "./src/database/db";

dotenv.config();

async function run() {
  await connectDB();
  const service = NotificationService.getInstance();
  
  console.log("-----------------------------------------");
  console.log("Triggering Customer test push notification...");
  await service.sendPushNotification(
    "ExponentPushToken[VVBlT0MU13pQ7Od8a4eQP5]",
    "Test Customer Title",
    "Test Customer Body",
    { test: "customer" }
  );

  console.log("-----------------------------------------");
  console.log("Triggering Driver test push notification...");
  await service.sendPushNotification(
    "ExponentPushToken[HuMZx1HXfQy8BdBrkjxOfe]",
    "Test Driver Title",
    "Test Driver Body",
    { test: "driver" }
  );
  
  console.log("-----------------------------------------");
  console.log("Waiting 20 seconds for async receipts checking to complete...");
  await new Promise(resolve => setTimeout(resolve, 20000));
  process.exit(0);
}

run().catch(console.error);
