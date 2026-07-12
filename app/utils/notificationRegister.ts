import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { customFetch } from "./api/custom-fetch";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("[PushNotifications] Skipped registration: must run on physical device");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
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

    // Call backend API via customFetch
    await customFetch("/api/v1/users/push-token", {
      method: "POST",
      body: JSON.stringify({ expoPushToken }),
    });

    console.log("[PushNotifications] Registered token on backend successfully!");
    return expoPushToken;
  } catch (error) {
    console.error("[PushNotifications] Error during registration:", error);
    return null;
  }
}
