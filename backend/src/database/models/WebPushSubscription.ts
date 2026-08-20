import { Schema } from "mongoose";

/**
 * Shared sub-schema for browser Web Push subscriptions (admin/support/vendor dashboard).
 * Embedded as an array on User and Vendor — one entry per browser/device the user has
 * granted notification permission on.
 */
export interface IWebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const webPushSubscriptionSchema = new Schema<IWebPushSubscription>(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false }
);
