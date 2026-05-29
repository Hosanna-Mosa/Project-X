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
import { router, useLocalSearchParams } from "expo-router";
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
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { status, setStatus, currentOrderId, setOrderId, route, setRoute, stops, setStops, driver, setDriver, unreadCount, incrementUnreadCount } = useDeliveryStore();
  const [eta, setEta] = useState(15);
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const mapRef = React.useRef<MapBackgroundRef>(null);

  useEffect(() => {
    if (params.orderId && params.orderId !== currentOrderId) {
      setOrderId(params.orderId);
    }
  }, [params.orderId, currentOrderId]);

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
    if (!currentOrderId) return;

    const fetchOrderDetails = () => {
      customFetch<any>(`/api/v1/orders/${currentOrderId}`)
        .then((order) => {
          if (order) {
            console.log("[POLLING] Fetched order details:", order.status);
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
                type: s.type,
                items: s.items?.lines || [],
              }));
              setStops(mappedStops);
            }
            if (order.radius) {
              setRadius(order.radius);
            }
            if (order.deliveryOtp) {
              setDeliveryOtp(order.deliveryOtp);
            }
            if (order.polyline) {
              setRoute({
                totalDistance: order.totalDistance || 0,
                estimatedTime: order.duration || 15,
                polyline: order.polyline,
              });
            }
          }
        })
        .catch((err) => console.error("Error fetching order in tracking:", err));
    };

    fetchOrderDetails();
    const interval = setInterval(fetchOrderDetails, 7000);

    return () => clearInterval(interval);
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

  const deliveryStop = stops?.find(s => s.type?.toLowerCase() === "delivery" || s.type?.toLowerCase() === "drop");
  const userLocCoords = deliveryStop ? { lat: Number(deliveryStop.lat), lng: Number(deliveryStop.lng) } : null;

  if (status === "delivered") {
    const foodItems = deliveryStop?.items || [];
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={styles.successHeaderCard}>
          <View style={[styles.successIconCircle, { backgroundColor: colors.success + "15" }]}>
            <Feather name="check-circle" size={80} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Order Delivered!</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Your meal has been delivered successfully by {driver?.name || "our delivery partner"}.
          </Text>
        </View>

        <ScrollView style={styles.successDetailsScroll} showsVerticalScrollIndicator={false}>
          {/* Order Summary */}
          <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.successCardHeader, { color: colors.text }]}>Delivered Items</Text>
            {foodItems.map((item: any, idx: number) => (
              <View key={idx} style={styles.successItemRow}>
                <Text style={[styles.successItemQty, { color: colors.primary }]}>{item.quantity}x</Text>
                <Text style={[styles.successItemName, { color: colors.text }]}>{item.name}</Text>
              </View>
            ))}
            {foodItems.length === 0 && (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Items successfully handed over.</Text>
            )}
          </View>

          {/* Delivery Address */}
          {deliveryStop?.address && (
            <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.successCardHeader, { color: colors.text }]}>Delivery Address</Text>
              <Text style={[styles.successAddressText, { color: colors.textSecondary }]}>
                {deliveryStop.address}
              </Text>
            </View>
          )}

          {/* Feedback Section */}
          <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: "center", gap: 10 }]}>
            <Text style={[styles.successCardHeader, { color: colors.text, alignSelf: "flex-start" }]}>Rate your Experience</Text>
            <View style={{ flexDirection: "row", gap: 6, marginVertical: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Feather key={star} name="star" size={24} color="#F59E0B" />
              ))}
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Your feedback helps us improve our services.</Text>
          </View>
        </ScrollView>

        <View style={[styles.successFooter, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={[styles.successHomeBtn, { backgroundColor: colors.primary }]} onPress={handleBack}>
            <Text style={styles.successHomeBtnText}>Go Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapBackground 
        ref={mapRef}
        stops={stops}
        polyline={["en_route_delivery", "arrived_delivery"].includes(status) ? route?.polyline : undefined}
        driverLocation={driverLocation}
        userLocation={userLocCoords}
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

              {deliveryOtp && (
                <View style={styles.otpCard}>
                  <Feather name="shield" size={20} color={colors.primary} />
                  <View style={styles.otpTextContainer}>
                    <Text style={styles.otpTitle}>Share OTP to receive order</Text>
                    <Text style={styles.otpSubtitle}>Only give this code when your items are safely received</Text>
                  </View>
                  <View style={styles.otpBadge}>
                    <Text style={styles.otpCode}>{deliveryOtp}</Text>
                  </View>
                </View>
              )}

              <OrderStatusTimeline currentStatus={status} />
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
  otpCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  otpTextContainer: {
    flex: 1,
    gap: 2,
  },
  otpTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  otpSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  otpBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  otpCode: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    alignItems: "center",
  },
  successHeaderCard: {
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  successDetailsScroll: {
    flex: 1,
    width: "100%",
    marginBottom: 16,
  },
  successCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    width: "100%",
  },
  successCardHeader: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  successItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  successItemQty: {
    fontSize: 14,
    fontWeight: "800",
  },
  successItemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  successAddressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  successFooter: {
    width: "100%",
    paddingTop: 12,
  },
  successHomeBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    elevation: 3,
  },
  successHomeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
