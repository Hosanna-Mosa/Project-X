import { Share } from "react-native";
import Constants from "expo-constants";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || Constants.expoConfig?.extra?.webUrl || "";

/**
 * Shares a restaurant (optionally scrolled/highlighted to one specific dish) as a link that
 * works for anyone, app-installed or not:
 *  - No app installed → opens the web preview page (frontend/src/routes/restaurant-menu.tsx).
 *  - App installed AND Universal Links are configured (see app.config.js `associatedDomains` —
 *    needs your Apple Team ID + Android signing SHA256 filled in first) → opens directly in-app.
 * Until Universal Links are configured, this still works today — it just always opens the web
 * page rather than skipping straight to the app.
 */
export async function shareRestaurant(vendorId: string, name: string, itemId?: string, itemName?: string) {
  if (!WEB_URL) {
    console.warn("[shareLink] EXPO_PUBLIC_WEB_URL is not set — can't build a shareable link.");
    return;
  }

  const url = itemId
    ? `${WEB_URL}/restaurant-menu/${vendorId}?item=${itemId}`
    : `${WEB_URL}/restaurant-menu/${vendorId}`;

  const message = itemId
    ? `Check out ${itemName || "this dish"} at ${name} on Flavour! ${url}`
    : `Check out ${name} on Flavour! ${url}`;

  try {
    await Share.share({ message, url });
  } catch (err) {
    console.error("[shareLink] Share failed:", err);
  }
}
