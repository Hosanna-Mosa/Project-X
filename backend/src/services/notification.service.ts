import axios from "axios";
import Notification, { INotification } from "../database/models/Notification";
import User from "../database/models/User";
import { SocketManager } from "../sockets/socket.manager";

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
        await this.sendPushNotification(user.expoPushToken, title, body, data);
      }
    } catch (err) {
      console.error("[NotificationService] Push notification fetch/dispatch failed:", err);
    }

    return notification;
  }

  /**
   * Sends push notifications in batches of up to 100 tokens.
   * Handles ticket status checks, receipt polling, and stale token cleanup (Priority 2 & 5).
   */
  public async sendPushNotificationsBatch(
    expoPushTokens: string[],
    title: string,
    body: string,
    data?: any
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
          channelId: "default", // Route explicitly to our custom high-importance channel
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
    data?: any
  ): Promise<boolean> {
    return this.sendPushNotificationsBatch([expoPushToken], title, body, data);
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
