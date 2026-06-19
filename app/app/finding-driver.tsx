import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { socketService } from "@/utils/socketService";
import { Ionicons } from "@expo/vector-icons";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { customFetch } from "@/utils/api/custom-fetch";

export default function FindingDriverScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, isReserved, dateTimeStr } = useLocalSearchParams<{ orderId: string; isReserved?: string; dateTimeStr?: string }>();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedDriver, setConfirmedDriver] = useState<any>(null);

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

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

    const checkOrderStatus = async () => {
      if (isTransitioned) return;
      try {
        const orderData = await customFetch<any>(`/api/v1/orders/${orderId}`, { responseType: "json" });
        if (orderData && orderData.status && orderData.status.toUpperCase() === "DRIVER_ASSIGNED") {
          console.log("Order was accepted:", orderData);
          handleTransition(orderData.driver, orderData.reservedAt);
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

    socketService.on("order_accepted", handleOrderAccepted);

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

  if (bookingConfirmed && confirmedDriver) {
    let formattedDate = "scheduled time";
    if (dateTimeStr) {
      formattedDate = dateTimeStr;
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Ionicons name="checkmark-circle" size={100} color={colors.primary} style={{ marginBottom: 20 }} />
        <Text style={[styles.text, { color: colors.text, fontSize: 26, fontWeight: "bold" }]}>Booking Confirmed!</Text>
        <Text style={{ color: colors.textSecondary, textAlign: "center", marginHorizontal: 30, marginBottom: 40, marginTop: 15, fontSize: 16, lineHeight: 24 }}>
          Driver has accepted your reserved ride request for {formattedDate}! We will notify you 15 minutes before the ride time.
        </Text>
        
        <View style={{ backgroundColor: colors.card, padding: 25, borderRadius: 16, width: '85%', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.radarContainer}>
        <Animated.View 
          style={[
            styles.radar, 
            { 
              borderColor: colors.primary, 
              transform: [{ scale }], 
              opacity 
            }
          ]} 
        />
        <View style={[styles.radarCenter, { backgroundColor: colors.primary }]}>
            <Ionicons name="search" size={32} color="#fff" />
        </View>
      </View>
      <Text style={[styles.text, { color: colors.text }]}>
        {isReserved === "true" ? "Finding a captain for your reservation..." : "Finding your driver..."}
      </Text>
      
      <View style={[styles.cancelButtonContainer, { bottom: insets.bottom + 20 }]}>
         <Text style={[styles.cancelText, { color: colors.error }]} onPress={handleCancel}>Cancel Request</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  radarCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  radar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    borderWidth: 4, 
    position: "absolute" 
  },
  text: { fontSize: 20, fontWeight: "700", marginTop: 40 },
  cancelButtonContainer: {
    position: "absolute",
    bottom: 50,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    padding: 10,
  }
});
