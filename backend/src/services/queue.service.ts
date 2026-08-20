import { Queue, Worker, Job } from "bullmq";
import Order, { OrderStatus } from "../database/models/Order";
import { SocketManager } from "../sockets/socket.manager";
import { NotificationService } from "./notification.service";

// Parse Redis URL securely
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const parsedUrl = new URL(redisUrl);
const connection = {
  host: parsedUrl.hostname || "127.0.0.1",
  port: parsedUrl.port ? Number(parsedUrl.port) : 6379,
  username: parsedUrl.username || undefined,
  password: parsedUrl.password || undefined,
};

export class QueueManager {
  private static instance: QueueManager;
  private queue: Queue;
  private worker: Worker | null = null;

  private constructor() {
    this.queue = new Queue("reserved-rides", { connection });
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  public startWorker() {
    if (this.worker) return;

    this.worker = new Worker("reserved-rides", async (job: Job) => {
      console.log(`[QUEUE WORKER] Processing reservation job ${job.id} for order: ${job.data.orderId}`);
      
      const { orderId } = job.data;
      const order = await Order.findById(orderId)
        .populate("user")
        .populate({
          path: "driver",
          populate: { path: "user" }
        });

      if (!order) {
        console.warn(`[QUEUE WORKER] Order ${orderId} not found. Skipping.`);
        return;
      }

      // Check if order is still a valid reserved order that has been assigned a driver but not notified
      if (order.isReserved && order.status === OrderStatus.DRIVER_ASSIGNED && !order.notified15Min) {
        order.notified15Min = true;
        await order.save();

        const orderUser = order.user as any;
        const driverObj = order.driver as any;
        const driverUser = driverObj?.user as any;

        const payload = {
          orderId: order._id,
          isReserved: true,
          reservedAt: order.reservedAt,
          serviceType: order.serviceType,
          customerName: orderUser?.name || "Customer",
          customerPhone: orderUser?.phone || "",
          driverName: driverUser?.name || "Driver",
          driverPhone: driverUser?.phone || "",
        };

        const socketManager = SocketManager.getInstance();
        if (socketManager) {
          console.log(`[QUEUE WORKER] Dispatching socket notification for reservation order ${order._id}`);
          if (orderUser?._id) {
            socketManager.emitToUser(orderUser._id.toString(), "upcoming_reserved_ride", payload);
          }
          if (driverUser?._id) {
            socketManager.emitToUser(driverUser._id.toString(), "upcoming_reserved_ride", payload);
          }
        }

        // Send Push & In-app Notifications to both customer and driver
        const notificationService = NotificationService.getInstance();
        if (orderUser?._id) {
          try {
            await notificationService.sendNotification({
              userId: orderUser._id.toString(),
              title: "Upcoming Scheduled Ride ⏰",
              body: `Your scheduled ${order.serviceType} ride is starting in 15 minutes.`,
              type: "transactional",
              category: "order_status",
              data: { orderId: order._id, deepLink: { screen: "/tracking", params: { orderId: order._id.toString() } } }
            });
          } catch (err) {
            console.error("[queue.service] Error sending customer reservation notification:", err);
          }
        }
        if (driverUser?._id) {
          try {
            await notificationService.sendNotification({
              userId: driverUser._id.toString(),
              title: "Upcoming Reserved Job ⏰",
              body: `Your assigned job starts in 15 minutes. Please head to the customer.`,
              type: "transactional",
              category: "order_status",
              data: { orderId: order._id, deepLink: { screen: "/active-order", params: { orderId: order._id.toString() } } }
            });
          } catch (err) {
            console.error("[queue.service] Error sending driver reservation notification:", err);
          }
        }
      } else {
        console.log(`[QUEUE WORKER] Order ${orderId} status is ${order.status} (Notified: ${order.notified15Min}). No notification needed.`);
      }
    }, { connection });

    this.worker.on("completed", (job) => {
      console.log(`[QUEUE WORKER] Job ${job.id} completed successfully.`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`[QUEUE WORKER] Job ${job?.id} failed:`, err.message);
    });

    console.log("🚀 BullMQ worker started for 'reserved-rides' queue.");
  }

  public async scheduleReservedRideNotification(orderId: string, delayMs: number) {
    // Prevent scheduling if delay is negative or very small (fire immediately in 1 sec)
    const delay = Math.max(1000, delayMs);
    
    // Add job with a unique job ID to prevent duplicate job dispatching for the same order
    const jobId = `notify-15m-${orderId}`;
    
    await this.queue.add("notify-15-min", { orderId }, {
      delay,
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
    });

    console.log(`[QUEUE] Scheduled 15m notification for order ${orderId} with delay ${Math.round(delay / 1000)}s`);
  }
}
