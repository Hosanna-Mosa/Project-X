import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

export async function registerForPushNotificationsAsync(token: string) {
  if (!Device.isDevice) {
    console.log("[PushNotifications] Skipped registration: must run on physical device");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Jobs & account updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
    await Notifications.setNotificationChannelAsync("chat", {
      name: "Chat messages",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("[PushNotifications] Permission not granted!");
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("[PushNotifications] EAS projectId not found in config");
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const expoPushToken = tokenResponse.data;
    console.log("[PushNotifications] Retrieved token:", expoPushToken);

    // Call backend API using fetch
    const response = await fetch(`${apiUrl}/api/v1/users/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ expoPushToken }),
    });

    if (response.ok) {
      console.log("[PushNotifications] Registered token on backend successfully!");
    } else {
      const err = await response.json();
      console.error("[PushNotifications] Failed to register token on backend:", err);
    }
    
    return expoPushToken;
  } catch (error) {
    console.error("[PushNotifications] Error during registration:", error);
    return null;
  }
}
