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
   * Sends a native push notification to a device via the Expo Push API.
   */
  public async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    // Verification of expo push token structure
    if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
      console.warn(`[NotificationService] Invalid Expo Push Token: ${expoPushToken}`);
      return false;
    }

    try {
      const response = await axios.post(
        "https://exp.host/--/api/v2/push/send",
        {
          to: expoPushToken,
          sound: "default",
          title,
          body,
          data,
          _displayInForeground: true,
        },
        {
          headers: {
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        console.log(`[NotificationService] Push sent successfully to token: ${expoPushToken}`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error(
        "[NotificationService] Expo Push API Request failed:",
        err.response?.data || err.message
      );
      return false;
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
