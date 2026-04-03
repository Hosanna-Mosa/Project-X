import React, { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";

export const LocationHandler = () => {
  const { isOnline, driverPhone, currentOrder } = useDriverStore();
  const watcher = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupTracking = async () => {
      // Permission Check
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // 1. Get Initial Location Fast (LastKnown)
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown && isMounted) {
        updateLocalOnly(lastKnown.coords.latitude, lastKnown.coords.longitude);
      }

      // 2. Get Current Location (Balanced)
      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (current && isMounted) {
          updateLocalOnly(current.coords.latitude, current.coords.longitude);
        }
      } catch (e) {}

      // 3. Start High-Accuracy Watch
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
              updateAndBroadcast(location.coords.latitude, location.coords.longitude);
            } else {
              updateLocalOnly(location.coords.latitude, location.coords.longitude);
            }
          }
        }
      );
    };

    const updateLocalOnly = (lat: number, lng: number) => {
        const { updateDriverLocation } = useDriverStore.getState();
        updateDriverLocation(lat, lng);
    };

    const updateAndBroadcast = (lat: number, lng: number) => {
      updateLocalOnly(lat, lng);
      
      if (isOnline) {
        socketService.emit("driver_location_update", {
          driverId: driverPhone || "driver-123",
          lat: lat,
          lng: lng,
          orderId: currentOrder?.id
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
  }, [isOnline, currentOrder?.id, driverPhone]);

  return null;
};
