import Order, { OrderStatus } from "../database/models/Order";
import User, { UserRole } from "../database/models/User";
import Notification from "../database/models/Notification";
import { NotificationService } from "./notification.service";

export class SchedulerService {
  private static instance: SchedulerService;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Starts the background scheduler loop. Runs checks every 10 minutes.
   */
  public startScheduler() {
    if (this.intervalId) return;

    // Run immediately on start, then every 10 minutes
    this.runChecks();
    this.intervalId = setInterval(() => {
      this.runChecks();
    }, 10 * 60 * 1000); // 10 minutes

    console.log("🚀 Background Scheduler Service started.");
  }

  /**
   * Stops the background scheduler loop.
   */
  public stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏹️ Background Scheduler Service stopped.");
    }
  }

  /**
   * Runs all periodic detectors
   */
  public async runChecks() {
    console.log("[SCHEDULER] Running periodic checks...");
    await this.checkAbandonedBookings();
    await this.checkCommuteHours();
  }

  /**
   * Scans for orders stuck in SEARCHING_DRIVER or CREATED for over 15 minutes
   * and nudges the passenger to re-book.
   */
  public async checkAbandonedBookings(): Promise<number> {
    let nudgeCount = 0;
    try {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000);

      // Find orders created between 15 and 45 minutes ago that are still in creation/matching state
      const stuckOrders = await Order.find({
        status: { $in: [OrderStatus.CREATED, OrderStatus.SEARCHING_DRIVER] },
        createdAt: { $gte: fortyFiveMinsAgo, $lte: fifteenMinsAgo },
      });

      console.log(`[SCHEDULER] Found ${stuckOrders.length} potentially abandoned bookings.`);

      const notificationService = NotificationService.getInstance();

      for (const order of stuckOrders) {
        if (!order.user) continue;

        // Verify if we have already sent an abandoned nudge for this order
        const alreadyNotified = await Notification.findOne({
          user: order.user,
          "data.orderId": order._id,
          category: "abandoned_booking",
        });

        if (!alreadyNotified) {
          try {
            await notificationService.sendNotification({
              userId: order.user.toString(),
              title: "Still need a ride? 🚙",
              body: "We noticed your booking request is still pending. Tap here to check nearby drivers and try again.",
              type: "promotional",
              category: "abandoned_booking",
              data: {
                orderId: order._id,
                type: "abandoned_booking",
                // Note: no screen shows a single stale pending order by ID — ride-searching.tsx
                // needs a fresh serviceId/rideId to (re)start a search, not an orderId. Send them
                // home to start over instead of a route that would silently ignore the param.
                deepLink: { screen: "/(tabs)" },
              },
            });
            nudgeCount++;
          } catch (err) {
            console.error(`[SCHEDULER] Failed to nudge user ${order.user} for order ${order._id}:`, err);
          }
        }
      }
      console.log(`[SCHEDULER] Dispatched ${nudgeCount} abandoned booking alerts.`);
    } catch (err) {
      console.error("[SCHEDULER] checkAbandonedBookings failed:", err);
    }
    return nudgeCount;
  }

  /**
   * Automatically triggers commuter notifications based on local rush hours
   * Morning: 8:30 AM - 9:30 AM
   * Evening: 5:30 PM - 6:30 PM
   */
  public async checkCommuteHours(): Promise<number> {
    let notifyCount = 0;
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Check if we are in rush hours (Morning: 8:30-9:00, Evening: 17:30-18:00)
      const isMorningCommute = (hours === 8 && minutes >= 30) || (hours === 9 && minutes <= 30);
      const isEveningCommute = (hours === 17 && minutes >= 30) || (hours === 18 && minutes <= 30);

      if (!isMorningCommute && !isEveningCommute) {
        return 0; // Not rush hour, skip
      }

      // Check if we already sent a commute alert to *any* user in the last 4 hours (to prevent duplicate alerts inside the window)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const recentlyNotified = await Notification.findOne({
        category: "commute_alert",
        createdAt: { $gte: fourHoursAgo },
      });

      if (recentlyNotified) {
        console.log("[SCHEDULER] Commute alert already dispatched recently. Skipping duplicate check.");
        return 0;
      }

      notifyCount = await this.triggerCommuterAlerts();
    } catch (err) {
      console.error("[SCHEDULER] checkCommuteHours failed:", err);
    }
    return notifyCount;
  }

  /**
   * Dispatches commuter rush hour alerts to all non-blocked users
   */
  public async triggerCommuterAlerts(): Promise<number> {
    let count = 0;
    try {
      const users = await User.find({ role: UserRole.USER, isBlocked: false }).select("_id");
      console.log(`[SCHEDULER] Sending commuter nudges to ${users.length} users.`);

      const notificationService = NotificationService.getInstance();
      for (const u of users) {
        try {
          await notificationService.sendNotification({
            userId: u._id.toString(),
            title: "Beat the Rush Hour! 🚖",
            body: "Avoid peak traffic and dynamic fares. Book a bike taxi or cab now for a quick ride.",
            type: "promotional",
            category: "commute_alert",
            data: {
              type: "commute_promo",
              deepLink: { screen: "/(tabs)" },
            },
          });
          count++;
        } catch (err) {
          console.error(`[SCHEDULER] Failed to send commute alert to user ${u._id}:`, err);
        }
      }
    } catch (err) {
      console.error("[SCHEDULER] triggerCommuterAlerts failed:", err);
    }
    return count;
  }
}
