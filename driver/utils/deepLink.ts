import { router } from "expo-router";

export interface DeepLinkTarget {
  screen: string;
  params?: Record<string, string>;
}

/**
 * Resolves a notification's `data` payload into an in-app navigation target.
 *
 * Prefers the structured `data.deepLink` the backend attaches to every notification
 * (see backend/src/services/notification.service.ts). Falls back to the legacy
 * `orderId`-only shape so older/in-flight notifications sent before this existed
 * still take the user somewhere sensible.
 */
export function resolveNotificationTarget(data: any): DeepLinkTarget | null {
  if (!data) return null;

  const deepLink = data.deepLink;
  if (deepLink && typeof deepLink === "object" && typeof deepLink.screen === "string") {
    // Some notifications (e.g. SOS alerts) are addressed to the admin web app, not this one.
    if (deepLink.app && deepLink.app !== "driver") return null;
    return { screen: deepLink.screen, params: deepLink.params };
  }

  if (data.orderId) {
    return { screen: "/active-order", params: { orderId: String(data.orderId) } };
  }

  return null;
}

/** Resolves and navigates in one step; no-ops if there's nothing to open. */
export function navigateToNotificationTarget(data: any) {
  const target = resolveNotificationTarget(data);
  if (!target) return;
  router.push({ pathname: target.screen as any, params: target.params });
}
