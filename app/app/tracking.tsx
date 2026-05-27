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
import { useThemeStore } from "@/contexts/themeStore";
import { socketService } from "@/utils/socketService";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { OrderStatus } from "@/contexts/deliveryStore";
import { customFetch } from "@/utils/api/custom-fetch";

const STATUS_SEQUENCE: OrderStatus[] = [
  "confirmed",
  "driver_assigned",
  "en_route_pickup",
  "arrived_pickup",
  "picking_items",
  "en_route_delivery",
  "arrived_delivery",
  "delivered",
];

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const { status, setStatus, currentOrderId, route, stops, setStops, driver, setDriver, unreadCount, incrementUnreadCount } = useDeliveryStore();
  const [eta, setEta] = useState(15);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const mapRef = React.useRef<MapBackgroundRef>(null);

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const normalizeStatus = (backendStatus: string): OrderStatus => {
    const s = backendStatus.toLowerCase();
    switch (s) {
      case "created":
      case "searching_driver":
        return "confirmed";
      case "driver_assigned":
        return "driver_assigned";
      case "en_route_pickup":
      case "on_the_way":
        return "en_route_pickup";
      case "arrived_pickup":
        return "arrived_pickup";
      case "picking_items":
        return "picking_items";
      case "en_route_delivery":
      case "in_transit":
        return "en_route_delivery";
      case "arrived_delivery":
        return "arrived_delivery";
      case "delivered":
      case "completed":
        return "delivered";
      default:
        return "confirmed";
    }
  };

  useEffect(() => {
    if (currentOrderId) {
      customFetch<any>(`/api/v1/orders/${currentOrderId}`)
        .then((order) => {
          if (order) {
            if (order.status) {
              setStatus(normalizeStatus(order.status));
            }
            if (order.driver) {
              setDriver({
                id: order.driver._id,
                name: order.driver.name || "Driver",
                phone: order.driver.phone || "",
                vehicle: order.driver.vehicleType || "unknown",
              });
            }
            if (order.stops && order.stops.length > 0) {
              const mappedStops = order.stops.map((s: any) => ({
                id: s._id,
                address: s.address,
                lat: s.location.coordinates[1],
                lng: s.location.coordinates[0],
                items: s.items?.lines || [],
              }));
              setStops(mappedStops);
            }
            if (order.radius) {
              setRadius(order.radius);
            }
          }
        })
        .catch((err) => console.error("Error fetching order in tracking:", err));
    }
  }, [currentOrderId]);

  useEffect(() => {
    if (currentOrderId) {
      socketService.connect();
      socketService.trackOrder(currentOrderId);

      const onOrderAccepted = (data: any) => {
        console.log("Driver accepted the order:", data.driver);
        setDriver(data.driver);
        setStatus("driver_assigned");
      };

      const onLocationUpdate = (data: any) => {
        setDriverLocation({ lat: data.lat, lng: data.lng });
        setTimeout(() => mapRef.current?.fitToRoute(), 500);
      };

      const onStatusUpdate = (data: any) => {
        if (data.status) {
          setStatus(normalizeStatus(data.status));
        }
      };

      socketService.on("order_accepted", onOrderAccepted);
      socketService.on("driver_location_update", onLocationUpdate);
      socketService.on("order_status_update", onStatusUpdate);

      const timer = setInterval(() => {
        setEta((prev) => Math.max(1, prev - 1));
      }, 30000);

      return () => {
        clearInterval(timer);
        socketService.off("order_accepted", onOrderAccepted);
        socketService.off("driver_location_update", onLocationUpdate);
        socketService.off("order_status_update", onStatusUpdate);
      };
    }
  }, [currentOrderId]);

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
        radiusCenter={
          stops?.[0]?.lat !== undefined && stops?.[0]?.lng !== undefined
            ? { lat: stops[0].lat, lng: stops[0].lng }
            : null
        }
        radiusMeters={radius ? radius * 1000 : undefined}
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
          <Feather name="arrow-left" size={22} color={colors.text} />
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
                <Feather name="search" size={30} color={colors.primary} />
              </View>
              <Text style={styles.findingTitle}>Finding your delivery partner...</Text>
              <Text style={styles.findingSubtitle}>We're connecting you with the nearest professional driver.</Text>
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            </View>
          ) : (
            <>
              <View style={styles.driverCard}>
                <View style={styles.driverAvatar}>
                  <Feather name="user" size={28} color={colors.text} />
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
                    <Feather name="phone" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/chat")}>
                    <Feather name="message-square" size={18} color={colors.primary} />
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <OrderStatusTimeline currentStatus={status} />

              {/* Simulation button removed for real-time tracking */}

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

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.success,
  },
  etaText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
    backgroundColor: `${colors.primary}15`,
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
    borderColor: colors.primary,
    opacity: 0.3,
  },
  findingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  findingSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
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
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  driverInfo: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  driverMotto: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  driverActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    elevation: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  nextStatusBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  nextStatusText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    shadowColor: colors.primary,
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
