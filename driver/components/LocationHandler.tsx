import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";

const BACKGROUND_LOCATION_TASK = "BACKGROUND_DRIVER_LOCATION_TASK";

// Top-level Task Definition for Expo Background Location Updates
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn("[BackgroundLocation] Task error:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const loc = locations[locations.length - 1];
      const { latitude, longitude, heading } = loc.coords;

      const store = useDriverStore.getState();
      store.updateDriverLocation(latitude, longitude);

      if (store.isOnline) {
        // 1. Socket location broadcast if connected
        try {
          socketService.emit("driver_location_update", {
            driverId: store.driverPhone || store.driverUserId || "driver-123",
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            orderId: store.currentOrder?.id,
          });
        } catch (e) {}

        // 2. HTTP REST update to ensure backend MongoDB & Redis remain updated even if OS pauses WebSocket
        if (store.token) {
          try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || "http://localhost:8000";
            await fetch(`${apiUrl}/api/v1/drivers/location`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${store.token}`,
              },
              body: JSON.stringify({
                latitude: latitude,
                longitude: longitude,
              }),
            });
          } catch (fetchErr) {
            console.warn("[BackgroundLocation] REST location update failed:", fetchErr);
          }
        }
      }
    }
  }
});

export const LocationHandler = () => {
  const { isOnline, driverPhone, driverUserId, currentOrder } = useDriverStore();
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const appState = useRef(AppState.currentState);
  const isCheckingPermissions = useRef(false);

  // AppState Listener to reconnect socket & refresh when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState: AppStateStatus) => {
      // If returning to active, just log it. (We don't auto-reconnect because they are set offline below)
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("[LocationHandler] App resumed from background to foreground.");
      }

      // If going to background, force offline to sync state
      if (
        appState.current === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        // Skip if going to background due to a permission check popup
        if (isCheckingPermissions.current) {
          console.log("[LocationHandler] App went to background/inactive due to permission check. Skipping auto-offline.");
          appState.current = nextAppState;
          return;
        }

        console.log("[LocationHandler] App went to background. Forcing offline.");
        const store = useDriverStore.getState();
        if (store.isOnline) {
          store.goOffline();
          
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Status: Offline",
              body: "Your app is minimized, so you are now offline and won't receive new orders.",
              sound: true,
            },
            trigger: { seconds: 1 },
          });
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const setupTracking = async () => {
      isCheckingPermissions.current = true;
      try {
        // Check notification permissions first
        const { status: notifCheck } = await Notifications.getPermissionsAsync();
        let notifStatus = notifCheck;
        if (notifStatus !== "granted") {
          const requested = await Notifications.requestPermissionsAsync();
          notifStatus = requested.status;
        }

        // Check foreground location permissions first
        const { status: fgCheck } = await Location.getForegroundPermissionsAsync();
        let fgStatus = fgCheck;
        if (fgStatus !== "granted") {
          const requested = await Location.requestForegroundPermissionsAsync();
          fgStatus = requested.status;
        }
        if (fgStatus !== "granted") return;

        // 1. Get Initial Location Fast (LastKnown)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && isMounted) {
          if (isOnline) {
            updateAndBroadcast(lastKnown.coords.latitude, lastKnown.coords.longitude);
          } else {
            updateLocalOnly(lastKnown.coords.latitude, lastKnown.coords.longitude);
          }
        }

        // 2. Get Current Location (Balanced)
        try {
          const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (current && isMounted) {
            if (isOnline) {
              updateAndBroadcast(current.coords.latitude, current.coords.longitude);
            } else {
              updateLocalOnly(current.coords.latitude, current.coords.longitude);
            }
          }
        } catch (e) {}

        // 3. Start High-Accuracy Foreground Watch
        if (watcher.current) {
          watcher.current.remove();
          watcher.current = null;
        }

        watcher.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // 5 seconds
            distanceInterval: 10, // 10 meters
          },
          (location) => {
            if (isMounted) {
              if (isOnline) {
                updateAndBroadcast(location.coords.latitude, location.coords.longitude, location.coords.heading || 0);
              } else {
                updateLocalOnly(location.coords.latitude, location.coords.longitude);
              }
            }
          }
        );

        // 4. Background Location Service Management
        try {
          const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

          if (isOnline) {
            // Check background location permissions first
            const { status: bgCheck } = await Location.getBackgroundPermissionsAsync();
            let bgStatus = bgCheck;
            if (bgStatus !== "granted") {
              const requested = await Location.requestBackgroundPermissionsAsync();
              bgStatus = requested.status;
            }
            if (bgStatus === "granted") {
              if (!isTaskRegistered) {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                  accuracy: Location.Accuracy.Balanced,
                  timeInterval: 10000, // 10 seconds in background
                  distanceInterval: 10, // 10 meters
                  showsBackgroundLocationIndicator: true,
                  foregroundService: {
                    notificationTitle: "Flavour Driver Active",
                    notificationBody: "Tracking location for order dispatches in background...",
                    notificationColor: "#22C55E",
                  },
                });
                console.log("[LocationHandler] Background location tracking started.");
              }
            } else {
              console.warn("[LocationHandler] Background location permission not granted.");
            }
          } else {
            if (isTaskRegistered) {
              await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
              console.log("[LocationHandler] Background location tracking stopped.");
            }
          }
        } catch (bgErr) {
          console.warn("[LocationHandler] Error handling background location updates:", bgErr);
        }
      } finally {
        isCheckingPermissions.current = false;
      }
    };

    const updateLocalOnly = (lat: number, lng: number) => {
      const { updateDriverLocation } = useDriverStore.getState();
      updateDriverLocation(lat, lng);
    };

    const updateAndBroadcast = (lat: number, lng: number, heading?: number) => {
      updateLocalOnly(lat, lng);

      if (isOnline) {
        socketService.emit("driver_location_update", {
          driverId: driverPhone || driverUserId || "driver-123",
          lat: lat,
          lng: lng,
          heading: heading || 0,
          orderId: currentOrder?.id,
        });
      }
    };

    setupTracking();

    return () => {
      isMounted = false;
      if (watcher.current) {
        watcher.current.remove();
        watcher.current = null;
      }
    };
  }, [isOnline, currentOrder?.id, driverPhone, driverUserId]);

  return null;
};
