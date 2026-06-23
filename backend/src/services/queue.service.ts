import { Queue, Worker, Job } from "bullmq";
import Order, { OrderStatus } from "../database/models/Order";
import { SocketManager } from "../sockets/socket.manager";

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

        const socketManager = SocketManager.getInstance();
        if (socketManager) {
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

          console.log(`[QUEUE WORKER] Dispatching socket notification for reservation order ${order._id}`);

          if (orderUser?._id) {
            socketManager.emitToUser(orderUser._id.toString(), "upcoming_reserved_ride", payload);
          }
          if (driverUser?._id) {
            socketManager.emitToUser(driverUser._id.toString(), "upcoming_reserved_ride", payload);
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
