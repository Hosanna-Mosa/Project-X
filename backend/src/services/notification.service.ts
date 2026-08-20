import axios from "axios";
import webpush from "web-push";
import Notification, { INotification } from "../database/models/Notification";
import User from "../database/models/User";
import Vendor from "../database/models/Vendor";
import { IWebPushSubscription } from "../database/models/WebPushSubscription";
import { SocketManager } from "../sockets/socket.manager";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("[NotificationService] VAPID keys not set — browser web push is disabled.");
}

export interface SendNotificationPayload {
  userId: string;
  title: string;
  body: string;
  type?: string;     // 'transactional', 'promotional', 'alert'
  category?: string; // 'order_status', 'chat', 'system'
  data?: Record<string, any>;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Sends a notification to a user.
   * Saves to MongoDB, sends a real-time WebSocket event, and pushes natively via Expo.
   */
  public async sendNotification(payload: SendNotificationPayload): Promise<INotification> {
    const { userId, title, body, type = "transactional", category = "system", data } = payload;

    // 1. Save in-app notification in MongoDB
    const notification = new Notification({
      user: userId,
      title,
      body,
      type,
      category,
      data,
    });
    await notification.save();

    // 2. Emit real-time WebSocket event if user is connected
    try {
      const socketManager = SocketManager.getInstance();
      if (socketManager) {
        socketManager.emitToUser(
          userId.toString(),
          "new_notification",
          {
            id: notification._id,
            title,
            body,
            type,
            category,
            data,
            isRead: false,
            createdAt: notification.createdAt,
          },
          "notification.service"
        );
      }
    } catch (err) {
      console.error("[NotificationService] Socket emission failed:", err);
    }

    // 3. Send Push Notification via Expo if target user has a push token registered
    try {
      const user = await User.findById(userId).select("expoPushToken");
      if (user && user.expoPushToken) {
        await this.sendPushNotification(user.expoPushToken, title, body, data, this.resolveChannelId(type, category));
      }
    } catch (err) {
      console.error("[NotificationService] Push notification fetch/dispatch failed:", err);
    }

    // 4. Send browser Web Push if the target has any subscriptions registered — covers the
    // admin/support dashboard (User) and the vendor dashboard (separate Vendor collection,
    // but reuses this same userId-keyed call since a vendor's JWT userId is its Vendor _id).
    try {
      await this.sendWebPushToId(userId.toString(), title, body, data);
    } catch (err) {
      console.error("[NotificationService] Web push dispatch failed:", err);
    }

    return notification;
  }

  /**
   * Sends a browser Web Push notification to every subscription registered against the given
   * id, checking the User collection first (admin/support) and falling back to Vendor. Prunes
   * subscriptions the browser has revoked (410 Gone / 404 Not Found).
   */
  private async sendWebPushToId(id: string, title: string, body: string, data?: any): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    let subscriptions: IWebPushSubscription[] | undefined;
    // Typed as `Model<any>` rather than `typeof User | typeof Vendor` — TS can't merge the two
    // models' overloaded findByIdAndUpdate signatures into one callable union.
    let ownerModel: import("mongoose").Model<any> = User;

    const user = await User.findById(id).select("webPushSubscriptions");
    if (user?.webPushSubscriptions?.length) {
      subscriptions = user.webPushSubscriptions;
    } else {
      const vendor = await Vendor.findById(id).select("webPushSubscriptions");
      if (vendor?.webPushSubscriptions?.length) {
        subscriptions = vendor.webPushSubscriptions;
        ownerModel = Vendor;
      }
    }
    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, data });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub as any, payload);
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await ownerModel.findByIdAndUpdate(id, { $pull: { webPushSubscriptions: { endpoint: sub.endpoint } } });
          } else {
            console.error("[NotificationService] Web push send failed:", err.message || err);
          }
        }
      })
    );
  }

  /**
   * Maps a notification's type/category to an Android notification channel, so users can
   * mute promotions independently from order/chat alerts at the OS level.
   */
  private resolveChannelId(type?: string, category?: string): string {
    if (category === "chat") return "chat";
    if (type === "promotional" || category === "abandoned_booking" || category === "commute_alert") return "promo";
    return "default";
  }

  /**
   * Sends push notifications in batches of up to 100 tokens.
   * Handles ticket status checks, receipt polling, and stale token cleanup (Priority 2 & 5).
   */
  public async sendPushNotificationsBatch(
    expoPushTokens: string[],
    title: string,
    body: string,
    data?: any,
    channelId: string = "default"
  ): Promise<boolean> {
    // 1. Filter out invalid tokens
    const validTokens = expoPushTokens.filter(token => token && token.startsWith("ExponentPushToken"));
    if (validTokens.length === 0) {
      console.warn("[NotificationService] No valid Expo Push Tokens provided.");
      return false;
    }

    // 2. Chunk tokens into batches of 100 (Priority 5)
    const chunkSize = 100;
    const chunks: string[][] = [];
    for (let i = 0; i < validTokens.length; i += chunkSize) {
      chunks.push(validTokens.slice(i, i + chunkSize));
    }

    let allSucceeded = true;

    for (const chunk of chunks) {
      try {
        // Construct payload. Note: Expo expects an array of messages
        const payload = chunk.map(token => ({
          to: token,
          sound: "default",
          title,
          body,
          data,
          channelId, // Routes to the matching Android channel registered client-side (default/chat/promo)
          _displayInForeground: true,
        }));

        const response = await axios.post(
          "https://exp.host/--/api/v2/push/send",
          payload,
          {
            headers: {
              "Accept": "application/json",
              "Accept-encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
          }
        );

        console.log(`[NotificationService] HTTP Status: ${response.status}`);
        console.log(`[NotificationService] Full Response Body:`, JSON.stringify(response.data));

        if (response.status === 200 && response.data && Array.isArray(response.data.data)) {
          const tickets = response.data.data;
          const ticketIds: string[] = [];
          const ticketToTokenMap = new Map<string, string>();

          tickets.forEach((ticket: any, index: number) => {
            const token = chunk[index];
            console.log(
              `[NotificationService][DIAGNOSTIC] Token[${index}] status=${ticket.status} ` +
              `message=${ticket.message || "N/A"} error=${ticket.details?.error || "N/A"}`
            );

            if (ticket.status === "ok") {
              ticketIds.push(ticket.id);
              ticketToTokenMap.set(ticket.id, token);
            } else {
              console.error(`[NotificationService] Ticket error for token ${token}: ${ticket.message}`);
              if (ticket.details?.error === "DeviceNotRegistered") {
                this.removePushToken(token).catch(err => 
                  console.error(`[NotificationService] Failed to clear token ${token}:`, err.message)
                );
              }
            }
          });

          // If we have tickets, poll for receipts after 15 seconds (Priority 2)
          if (ticketIds.length > 0) {
            this.pollReceipts(ticketIds, ticketToTokenMap).catch(err =>
              console.error("[NotificationService] Poll receipts failed:", err.message)
            );
          }
        } else {
          allSucceeded = false;
        }
      } catch (err: any) {
        allSucceeded = false;
        console.error(
          "[NotificationService] Expo Push API Request failed:",
          err.response?.data ? JSON.stringify(err.response.data) : err.message
        );
      }
    }

    return allSucceeded;
  }

  /**
   * Sends a native push notification to a single device.
   * Thin wrapper around sendPushNotificationsBatch.
   */
  public async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: any,
    channelId: string = "default"
  ): Promise<boolean> {
    return this.sendPushNotificationsBatch([expoPushToken], title, body, data, channelId);
  }

  /**
   * Clears a stale push token from user profiles.
   */
  private async removePushToken(token: string): Promise<void> {
    try {
      const result = await User.updateMany({ expoPushToken: token }, { $unset: { expoPushToken: "" } });
      console.log(`[NotificationService] Unset stale push token. Modified count: ${result.modifiedCount}`);
    } catch (err: any) {
      console.error(`[NotificationService] Error clearing stale token:`, err.message);
    }
  }

  /**
   * Polls Expo Push API receipts to confirm downstream delivery (Priority 2).
   */
  private async pollReceipts(ticketIds: string[], ticketToTokenMap: Map<string, string>): Promise<void> {
    // Wait 15 seconds for Expo to deliver and generate receipts
    await new Promise(resolve => setTimeout(resolve, 15000));

    try {
      const response = await axios.post(
        "https://exp.host/--/api/v2/push/getReceipts",
        { ids: ticketIds },
        {
          headers: {
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`[NotificationService][RECEIPTS] HTTP Status: ${response.status}`);
      console.log(`[NotificationService][RECEIPTS] Full Receipts Body:`, JSON.stringify(response.data));

      if (response.status === 200 && response.data && response.data.data) {
        const receipts = response.data.data;
        for (const ticketId of ticketIds) {
          const receipt = receipts[ticketId];
          const token = ticketToTokenMap.get(ticketId);
          if (receipt && token) {
            if (receipt.status === "error") {
              console.error(`[NotificationService][RECEIPTS] Delivery failed for token ${token}: status=${receipt.status}, message=${receipt.message || "N/A"}, error=${receipt.details?.error || "N/A"}`);
              if (receipt.details?.error === "DeviceNotRegistered") {
                await this.removePushToken(token);
              }
            } else if (receipt.status === "ok") {
              console.log(`[NotificationService][RECEIPTS] Delivery success confirmed for token ${token}`);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(
        "[NotificationService][RECEIPTS] Request failed:",
        err.response?.data ? JSON.stringify(err.response.data) : err.message
      );
    }
  }

  /**
   * Fetch paginated notification history for a user
   */
  public async getUserNotifications(userId: string, limit = 20, skip = 0): Promise<INotification[]> {
    return Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  /**
   * Get total count of unread notifications for a user
   */
  public async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ user: userId, isRead: false });
  }

  /**
   * Mark a specific notification as read
   */
  public async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { returnDocument: "after" }
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  public async markAllAsRead(userId: string): Promise<any> {
    return Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  /**
   * Delete a specific notification
   */
  public async deleteNotification(notificationId: string, userId: string): Promise<any> {
    return Notification.deleteOne({ _id: notificationId, user: userId });
  }
}
