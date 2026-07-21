import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Alert, TouchableOpacity, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { socketService } from "@/utils/socketService";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { MapBackground } from "@/components/MapBackground";

export default function FindingDriverScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, isReserved, dateTimeStr } = useLocalSearchParams<{ orderId: string; isReserved?: string; dateTimeStr?: string }>();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedDriver, setConfirmedDriver] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createPulse(pulse1, 0);
    const anim2 = createPulse(pulse2, 600);
    const anim3 = createPulse(pulse3, 1200);

    const animProgress = Animated.loop(
      Animated.timing(animatedProgress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    anim1.start();
    anim2.start();
    anim3.start();
    animProgress.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      animProgress.stop();
    };
  }, []);

  const screenWidth = Dimensions.get("window").width;
  const translateX = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, screenWidth],
  });

  useEffect(() => {
    if (!orderId) {
      router.push("/(tabs)");
      return;
    }

    const isReservedVal = isReserved === "true";

    // Hydrate the store with the active order ID
    const { setOrderId } = useDeliveryStore.getState();
    setOrderId(orderId);

    socketService.connect();
    socketService.trackOrder(orderId);

    let pollIntervalId: any;
    let isTransitioned = false;

    const handleTransition = (driverData: any, reservedAtVal?: any) => {
      if (isTransitioned) return;
      isTransitioned = true;

      if (pollIntervalId) clearInterval(pollIntervalId);
      if (timeoutTimer) clearTimeout(timeoutTimer);

      const { setDriver, setStatus } = useDeliveryStore.getState();
      
      const driverInfo = driverData ? (
        typeof driverData === "object" ? {
          id: driverData.id || driverData._id || "unknown",
          name: driverData.name || driverData.user?.name || "Driver",
          phone: driverData.phone || driverData.user?.phone || "",
          vehicle: driverData.vehicle || driverData.vehicleType || "unknown",
        } : {
          id: driverData,
          name: "Driver",
          phone: "",
          vehicle: "unknown",
        }
      ) : {
        id: "unknown",
        name: "Driver",
        phone: "",
        vehicle: "unknown",
      };

      setDriver(driverInfo);
      setStatus("driver_assigned");

      if (isReservedVal) {
        let formattedDate = "scheduled time";
        if (dateTimeStr) {
          formattedDate = dateTimeStr;
        } else {
          const dateSource = reservedAtVal || driverData?.reservedAt;
          if (dateSource) {
            try {
              formattedDate = new Date(dateSource).toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            } catch (e) {
              formattedDate = String(dateSource);
            }
          }
        }

        setConfirmedDriver(driverInfo);
        setBookingConfirmed(true);
      } else {
        router.push({
          pathname: "/tracking",
          params: { orderId }
        });
      }
    };

    const handleOrderCancelled = () => {
      if (isTransitioned) return;
      isTransitioned = true;

      if (pollIntervalId) clearInterval(pollIntervalId);
      if (timeoutTimer) clearTimeout(timeoutTimer);

      // Redirect immediately to clear the stuck screen
      router.replace("/(tabs)");

      setTimeout(() => {
        Alert.alert(
          "Order Cancelled",
          "Driver is unavailable.",
          [
            {
              text: "OK",
              onPress: () => {}
            }
          ],
          { cancelable: true }
        );
      }, 500);
    };

    const checkOrderStatus = async () => {
      if (isTransitioned) return;
      try {
        const orderData = await customFetch<any>(`/api/v1/orders/${orderId}`, { responseType: "json" });
        if (orderData) {
          if (orderData.stops && orderData.stops.length > 0) {
            const mappedStops = orderData.stops.map((s: any) => ({
              id: s._id,
              address: s.address,
              lat: s.location.coordinates[1],
              lng: s.location.coordinates[0],
              type: s.type,
              items: s.items?.lines || [],
            }));
            setStops(prev => {
              if (prev && prev.length === mappedStops.length) {
                const isSame = prev.every((val, idx) => val.id === mappedStops[idx].id);
                if (isSame) return prev;
              }
              return mappedStops;
            });
          }
          if (orderData.status && orderData.status.toUpperCase() === "CANCELLED") {
            handleOrderCancelled();
            return;
          }
          if (orderData.status && orderData.status.toUpperCase() === "DRIVER_ASSIGNED") {
            console.log("Order was accepted:", orderData);
            handleTransition(orderData.driver, orderData.reservedAt);
          }
        }
      } catch (err) {
        console.error("Error checking order status:", err);
      }
    };

    // Run immediately on mount
    checkOrderStatus();

    // Poll status every 2 seconds
    pollIntervalId = setInterval(checkOrderStatus, 2000);

    const handleOrderAccepted = (data: any) => {
      console.log("Order accepted socket event:", data);
      if (data && (data.orderId === orderId || String(data.orderId) === String(orderId))) {
        handleTransition(data.driver, data.reservedAt);
      }
    };

    const handleStatusUpdate = (data: any) => {
      console.log("Order status update socket event:", data);
      if (data && (data.orderId === orderId || String(data.orderId) === String(orderId))) {
        if (data.status && data.status.toUpperCase() === "CANCELLED") {
          handleOrderCancelled();
        }
      }
    };

    socketService.on("order_accepted", handleOrderAccepted);
    socketService.on("order_status_update", handleStatusUpdate);

    let timeoutTimer: any;
    if (isReservedVal) {
      timeoutTimer = setTimeout(async () => {
        if (isTransitioned) return;
        isTransitioned = true;
        
        if (pollIntervalId) clearInterval(pollIntervalId);

        Alert.alert(
          "No Captain Found",
          "Sorry, no captains are available to accept your reservation request at this time. Please try scheduling again later.",
          [
            {
              text: "OK",
              onPress: async () => {
                router.replace("/(tabs)");
                if (orderId) {
                  try {
                    await customFetch(`/api/v1/orders/${orderId}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "CANCELLED" }),
                    });
                  } catch (error) {
                    console.error("Failed to cancel order on backend:", error);
                  }
                }
              }
            }
          ]
        );
      }, 60000); // 1 minute
    }

    return () => {
      socketService.off("order_accepted", handleOrderAccepted);
      socketService.off("order_status_update", handleStatusUpdate);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [orderId, isReserved, dateTimeStr]);

  const handleCancel = async () => {
    router.push("/(tabs)");
    if (orderId) {
      try {
        await customFetch(`/api/v1/orders/${orderId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELLED" }),
        });
      } catch (error) {
        console.error("Failed to cancel order on backend:", error);
      }
    }
  };

  useEffect(() => {
    if (!stops || stops.length === 0) return;
    const pickupStop = stops.find(s => s.type === "pickup") || stops[0];
    if (!pickupStop || !pickupStop.lat || !pickupStop.lng) return;

    let active = true;
    const fetchOnlineDrivers = async () => {
      try {
        const queryParams = new URLSearchParams({
          latitude: String(pickupStop.lat),
          longitude: String(pickupStop.lng),
          radius: "50000",
        });
        const res = await customFetch<any[]>(`/api/v1/drivers/nearby?${queryParams.toString()}`);
        console.log(`[CLIENT DRIVER SEARCH RESPONSE] Returned count: ${res ? res.length : 0}`);
        if (active && Array.isArray(res)) {
          const mapped = res.map(drv => {
            const lat = drv.currentLocation?.coordinates?.[1] || drv.user?.addresses?.[0]?.location?.coordinates?.[1] || pickupStop.lat;
            const lng = drv.currentLocation?.coordinates?.[0] || drv.user?.addresses?.[0]?.location?.coordinates?.[0] || pickupStop.lng;
            return {
              id: drv._id,
              lat,
              lng,
              vehicleType: drv.vehicleType || "bike",
              name: drv.user?.name || "Driver",
            };
          }).filter(d => d.lat && d.lng);
          setOnlineDrivers(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch nearby drivers in finding-driver:", error);
      }
    };

    fetchOnlineDrivers();
    const interval = setInterval(fetchOnlineDrivers, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stops]);

  if (bookingConfirmed && confirmedDriver) {
    let formattedDate = "scheduled time";
    if (dateTimeStr) {
      formattedDate = dateTimeStr;
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Ionicons name="checkmark-circle" size={100} color={colors.primary} style={{ marginBottom: 20 }} />
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "bold" }}>Booking Confirmed!</Text>
        <Text style={{ color: colors.textSecondary, textAlign: "center", marginHorizontal: 30, marginBottom: 40, marginTop: 15, fontSize: 16, lineHeight: 24 }}>
          Driver has accepted your reserved ride request for {formattedDate}! We will notify you 15 minutes before the ride time.
        </Text>
        
        <View style={{ backgroundColor: colors.surface, padding: 25, borderRadius: 16, width: '85%', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "bold", marginBottom: 15 }}>Driver Details</Text>
          <Text style={{ color: colors.text, fontSize: 18, marginBottom: 8 }}>Name: {confirmedDriver.name}</Text>
          <Text style={{ color: colors.text, fontSize: 18, marginBottom: 8 }}>Vehicle: {confirmedDriver.vehicle}</Text>
          <Text style={{ color: colors.text, fontSize: 18, marginBottom: 8 }}>Phone: {confirmedDriver.phone || "N/A"}</Text>
        </View>

        <TouchableOpacity 
          style={{ marginTop: 50, backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 }}
          onPress={() => router.replace("/(tabs)/orders")}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapBackground 
        stops={stops}
        driverMarkers={onlineDrivers}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.floatingPanelContainer} pointerEvents="box-none">
        <View style={[styles.floatingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerInfo}>
            <View style={styles.statusDotRow}>
              <Animated.View style={[styles.pulseDot, { opacity: pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }), backgroundColor: colors.success }]} />
              <Text style={[styles.title, { color: colors.text }]}>
                {isReserved === "true" ? "Booking Reservation..." : "Finding your driver..."}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Scanning nearby partners in your surroundings
            </Text>
          </View>

          {/* Glowing Continuous Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBarActive,
                {
                  transform: [{ translateX }],
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>

          {/* Simple Info Row showing Proximity/Fare */}
          <View style={[styles.infoRow, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={styles.infoBadge}>
              <Feather name="truck" size={18} color={colors.text} />
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Connecting you with the best available delivery partner
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.cancelBtn, { borderColor: colors.border }]} 
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelText, { color: colors.error }]}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  floatingPanelContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 34,
    justifyContent: "flex-end",
  },
  floatingCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    gap: 16,
  },
  headerInfo: {
    marginBottom: 4,
  },
  statusDotRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginLeft: 16, // aligns with title text indent
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    position: "relative",
    marginBottom: 4,
  },
  progressBarActive: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
    borderRadius: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  infoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  cancelBtn: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
  }
});
