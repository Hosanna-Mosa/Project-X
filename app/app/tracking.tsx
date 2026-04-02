import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator } from "react-native";
import Colors from "@/constants/colors";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { socketService } from "@/utils/socketService";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { OrderStatus } from "@/contexts/deliveryStore";

const STATUS_SEQUENCE: OrderStatus[] = [
  "confirmed",
  "driver_assigned",
  "picking_items",
  "on_the_way",
  "delivered",
];

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const { status, setStatus, currentOrderId, route, stops, driver, setDriver } = useDeliveryStore();
  const [eta, setEta] = useState(15);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const mapRef = React.useRef<MapBackgroundRef>(null);

  useEffect(() => {
    if (status === "confirmed") {
      setStatus("driver_assigned");
    }

    if (currentOrderId) {
      socketService.connect();
      socketService.trackOrder(currentOrderId);

      socketService.on("order_accepted", (data) => {
        console.log("Driver accepted the order:", data.driver);
        setDriver(data.driver);
        setStatus("driver_assigned");
      });

      socketService.on("driver_location_update", (data) => {
        console.log("Driver Moved:", data);
        setDriverLocation({ lat: data.lat, lng: data.lng });
        
        // Update status if it's the first movement
        if (status === "driver_assigned") {
          setStatus("on_the_way");
        }

        // Fit map to show both user/stops and driver
        setTimeout(() => mapRef.current?.fitToRoute(), 500);
      });
    }

    const timer = setInterval(() => {
      setEta((prev) => Math.max(1, prev - 1));
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, [currentOrderId, status]);

  const handleBack = () => {
    router.replace("/(tabs)/orders");
  };

  return (
    <View style={styles.root}>
      <MapBackground 
        ref={mapRef}
        stops={stops}
        polyline={route?.polyline}
        driverLocation={driverLocation}
        style={StyleSheet.absoluteFill} 
      />

      <View
        style={[
          styles.topControls,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.etaBadge}>
          <View style={styles.etaDot} />
          <Text style={styles.etaText}>ETA: {eta} mins away</Text>
        </View>
        {/* Spacer to keep ETA centered */}
        <View style={styles.backBtn} />
      </View>

      <BottomSheet style={styles.bottomSheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {!driver ? (
            <View style={styles.findingDriverContainer}>
              <View style={styles.radarContainer}>
                <View style={styles.radarCircle} />
                <Feather name="search" size={30} color={Colors.light.primary} />
              </View>
              <Text style={styles.findingTitle}>Finding your delivery partner...</Text>
              <Text style={styles.findingSubtitle}>We're connecting you with the nearest professional driver.</Text>
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 24 }} />
            </View>
          ) : (
            <>
              <View style={styles.driverCard}>
                <View style={styles.driverAvatar}>
                  <Feather name="user" size={28} color={Colors.light.text} />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.name || "Assigned Driver"}</Text>
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>{driver.rating || "4.9"}</Text>
                  </View>
                  <Text style={styles.driverMotto}>Loves delivering on time</Text>
                </View>
                <View style={styles.driverActions}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Feather name="phone" size={18} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/chat")}>
                    <Feather name="message-square" size={18} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <OrderStatusTimeline currentStatus={status} />

              <TouchableOpacity
                style={styles.nextStatusBtn}
                onPress={() => {
                  const currentIndex = STATUS_SEQUENCE.indexOf(status);
                  if (currentIndex < STATUS_SEQUENCE.length - 1) {
                    setStatus(STATUS_SEQUENCE[currentIndex + 1]);
                  }
                }}
              >
                <Text style={styles.nextStatusText}>
                  {status === "delivered" ? "Order Delivered!" : "Simulate Next Step"}
                </Text>
              </TouchableOpacity>

              {status === "delivered" && (
                <TouchableOpacity style={styles.doneBtn} onPress={handleBack}>
                  <Text style={styles.doneBtnText}>View Order History</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  etaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.success,
  },
  etaText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "60%",
    paddingBottom: 0,
  },
  findingDriverContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  radarCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    opacity: 0.3,
  },
  findingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  findingSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  driverInfo: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  driverMotto: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  driverActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 16,
  },
  nextStatusBtn: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  nextStatusText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  doneBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
