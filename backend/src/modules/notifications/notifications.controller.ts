import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { NotificationService } from "../../services/notification.service";
import { SchedulerService } from "../../services/scheduler.service";
import User from "../../database/models/User";
import Vendor from "../../database/models/Vendor";

const VENDOR_ROLES = ["restaurant_vendor", "meat_vendor"];

export class NotificationsController {
  private notificationService = NotificationService.getInstance();

  /**
   * GET /api/v1/notifications
   * Retrieves paginated notification history for the authenticated user.
   */
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

      const notifications = await this.notificationService.getUserNotifications(userId, limit, skip);
      return res.json(notifications);
    } catch (error: any) {
      console.error("[NotificationsController] getNotifications failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Retrieves count of unread notifications for the user.
   */
  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const count = await this.notificationService.getUnreadCount(userId);
      return res.json({ unreadCount: count });
    } catch (error: any) {
      console.error("[NotificationsController] getUnreadCount failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Marks a specific notification as read.
   */
  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const notificationId = req.params.id as string;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const notification = await this.notificationService.markAsRead(notificationId, userId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found or access denied" });
      }

      return res.json(notification);
    } catch (error: any) {
      console.error("[NotificationsController] markAsRead failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * PATCH /api/v1/notifications/read-all
   * Marks all notifications as read for the user.
   */
  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      await this.notificationService.markAllAsRead(userId);
      return res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      console.error("[NotificationsController] markAllAsRead failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Deletes a notification from history.
   */
  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const notificationId = req.params.id as string;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await this.notificationService.deleteNotification(notificationId, userId);
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Notification not found or access denied" });
      }

      return res.json({ message: "Notification deleted successfully" });
    } catch (error: any) {
      console.error("[NotificationsController] deleteNotification failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/notifications/trigger-commute
   * Manually triggers commuter alerts for testing.
   */
  async triggerCommute(req: AuthRequest, res: Response) {
    try {
      const count = await SchedulerService.getInstance().triggerCommuterAlerts();
      return res.json({ success: true, message: `Dispatched commuter nudges to ${count} users.` });
    } catch (error: any) {
      console.error("[NotificationsController] triggerCommute failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/notifications/check-abandoned
   * Manually checks for abandoned bookings for testing.
   */
  async checkAbandoned(req: AuthRequest, res: Response) {
    try {
      const count = await SchedulerService.getInstance().checkAbandonedBookings();
      return res.json({ success: true, message: `Dispatched ${count} abandoned cart nudges.` });
    } catch (error: any) {
      console.error("[NotificationsController] checkAbandoned failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/notifications/web-push/subscribe
   * Registers a browser push subscription against whichever collection the caller's JWT
   * resolves to — Vendor for vendor logins, User for everyone else (admin/support in practice).
   */
  async webPushSubscribe(req: AuthRequest, res: Response) {
    try {
      const id = req.user?.userId;
      const { subscription } = req.body;
      if (!id) return res.status(401).json({ message: "Unauthorized" });
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ message: "A valid push subscription is required" });
      }

      // Typed as `Model<any>` — TS can't merge User's and Vendor's overloaded
      // findByIdAndUpdate signatures into one callable union.
      const Model: import("mongoose").Model<any> = VENDOR_ROLES.includes(req.user?.role as string) ? Vendor : User;
      await Model.findByIdAndUpdate(id, {
        $addToSet: {
          webPushSubscriptions: {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
          },
        },
      });

      return res.json({ message: "Subscribed to web push" });
    } catch (error: any) {
      console.error("[NotificationsController] webPushSubscribe failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/notifications/web-push/unsubscribe
   * Removes a single subscription (e.g. the browser revoked permission) by endpoint.
   */
  async webPushUnsubscribe(req: AuthRequest, res: Response) {
    try {
      const id = req.user?.userId;
      const { endpoint } = req.body;
      if (!id) return res.status(401).json({ message: "Unauthorized" });
      if (!endpoint) return res.status(400).json({ message: "endpoint is required" });

      const Model: import("mongoose").Model<any> = VENDOR_ROLES.includes(req.user?.role as string) ? Vendor : User;
      await Model.findByIdAndUpdate(id, { $pull: { webPushSubscriptions: { endpoint } } });

      return res.json({ message: "Unsubscribed from web push" });
    } catch (error: any) {
      console.error("[NotificationsController] webPushUnsubscribe failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
