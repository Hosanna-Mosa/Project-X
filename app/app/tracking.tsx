import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Animated, Dimensions } from "react-native";
import Colors from "@/constants/colors";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";
import { socketService } from "@/utils/socketService";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { OrderStatus } from "@/contexts/deliveryStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { hide } from "expo-router/build/utils/splash";

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
  const { status, setStatus, currentOrderId, setOrderId, serviceType, setServiceType, route, setRoute, stops, setStops, driver, setDriver, unreadCount, incrementUnreadCount, resetDelivery } = useDeliveryStore();

  const handleSOS = () => {
    if (!currentOrderId) return;
    
    Alert.alert(
      "Emergency SOS",
      "Are you sure you want to trigger SOS? This will instantly alert our support team and emergency contacts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Trigger SOS",
          style: "destructive",
          onPress: async () => {
            try {
              await customFetch(`/api/v1/orders/${currentOrderId}/sos`, {
                method: "POST"
              });
              Alert.alert(
                "SOS Dispatched",
                "Your emergency alert has been sent. Support is on the way."
              );
            } catch (err: any) {
              console.error("SOS trigger error:", err);
              Alert.alert("Error", err.message || "Failed to trigger SOS. Please call emergency services.");
            }
          }
        }
      ]
    );
  };

  const cancellationAlerted = React.useRef(false);

  const handleOrderCancelledByDriver = () => {
    if (cancellationAlerted.current) return;
    cancellationAlerted.current = true;

    Alert.alert(
      "Delivery Cancelled",
      "We are sorry, the driver is unable to complete your delivery. Your order has been cancelled.",
      [
        {
          text: "OK",
          onPress: () => {
            resetDelivery();
            router.replace("/(tabs)");
          }
        }
      ],
      { cancelable: false }
    );
  };
  const [eta, setEta] = useState(15);
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [startOtp, setStartOtp] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const mapRef = React.useRef<MapBackgroundRef>(null);

  const animatedProgress = React.useRef(new Animated.Value(0)).current;
  const pulse1 = React.useRef(new Animated.Value(0)).current;
  const pulse2 = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!driver) {
      const anim = Animated.loop(
        Animated.timing(animatedProgress, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      anim.start();

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
      const anim2 = createPulse(pulse2, 1000);

      anim1.start();
      anim2.start();

      return () => {
        anim.stop();
        anim1.stop();
        anim2.stop();
      };
    }
  }, [driver]);

  const screenWidth = Dimensions.get("window").width;
  const translateX = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, screenWidth],
  });

  useEffect(() => {
    if (cancellationAlerted.current) return;
    if (params.orderId && params.orderId !== currentOrderId) {
      setOrderId(params.orderId);
    }
  }, [params.orderId, currentOrderId]);

  useEffect(() => {
    if (status === "cancelled") {
      handleOrderCancelledByDriver();
    }
  }, [status]);

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const isRide = ["bike", "auto", "cab", "cab_prime"].includes(serviceType?.toLowerCase() || "");
  const isHelper = serviceType?.toLowerCase() === "helper";

  const [bottomSheetHeight, setBottomSheetHeight] = useState(300);

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
      case "cancelled":
        return "cancelled";
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
              if (order.status.toLowerCase() === "cancelled") {
                handleOrderCancelledByDriver();
                return;
              }
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
            if (order.serviceType) {
              setServiceType(order.serviceType);
            }
            if (order.restaurantPickupCode) {
              setStartOtp(order.restaurantPickupCode);
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
          if (data.status.toLowerCase() === "cancelled") {
            handleOrderCancelledByDriver();
            return;
          }
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
          <Text style={[styles.successTitle, { color: colors.text }]}>
            {isRide ? "Ride Completed!" : (isHelper ? "Task Completed!" : "Order Delivered!")}
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            {isRide
              ? `You have arrived safely at your destination with ${driver?.name || "your captain"}.`
              : (isHelper
                ? `Your helper task has been completed successfully by ${driver?.name || "your helper"}.`
                : `Your meal has been delivered successfully by ${driver?.name || "our delivery partner"}.`
              )}
          </Text>
        </View>

        <ScrollView style={styles.successDetailsScroll} showsVerticalScrollIndicator={false}>
          {isRide ? (
            <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.successCardHeader, { color: colors.text }]}>Ride Route</Text>
              <View style={{ gap: 8, paddingVertical: 4 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                  <Text style={{ fontSize: 13, color: colors.text, flex: 1 }} numberOfLines={2}>
                    {stops?.find((s) => s.type === "pickup")?.address || "Pickup Location"}
                  </Text>
                </View>
                <View style={{ width: 2, height: 12, backgroundColor: colors.border, marginLeft: 3 }} />
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error }} />
                  <Text style={{ fontSize: 13, color: colors.text, flex: 1 }} numberOfLines={2}>
                    {deliveryStop?.address || "Destination Location"}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* Order Summary / Task Details */}
              <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.successCardHeader, { color: colors.text }]}>
                  {isHelper ? "Task Details" : "Delivered Items"}
                </Text>
                {isHelper ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 14, color: colors.text }}>
                      Service: <Text style={{ fontWeight: "700" }}>General Helper & Task Specialist</Text>
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text }}>
                      Booked Location: <Text style={{ fontWeight: "700" }}>{stops?.[0]?.address || "N/A"}</Text>
                    </Text>
                  </View>
                ) : (
                  foodItems.map((item: any, idx: number) => (
                    <View key={idx} style={styles.successItemRow}>
                      <Text style={[styles.successItemQty, { color: colors.primary }]}>{item.quantity}x</Text>
                      <Text style={[styles.successItemName, { color: colors.text }]}>{item.name}</Text>
                    </View>
                  ))
                )}
                {!isHelper && foodItems.length === 0 && (
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
            </>
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
        <View style={{ width: 44 }} />
      </View>

      <BottomSheet style={styles.bottomSheet} defaultHeight={bottomSheetHeight} disableExpand={true}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onContentSizeChange={(width, height) => {
            setBottomSheetHeight(height + 100);
          }}
        >
          {!driver ? (
            <View style={styles.findingDriverContainer}>
              <View style={styles.radarContainer}>
                <Animated.View
                  style={[
                    styles.radarCircle,
                    {
                      borderColor: colors.primary,
                      transform: [{
                        scale: pulse1.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.2],
                        })
                      }],
                      opacity: pulse1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 0],
                      })
                    }
                  ]}
                />
                <Animated.View
                  style={[
                    styles.radarCircle,
                    {
                      borderColor: colors.primary,
                      transform: [{
                        scale: pulse2.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.2],
                        })
                      }],
                      opacity: pulse2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 0],
                      })
                    }
                  ]}
                />
                <View style={[styles.radarCenter, { backgroundColor: colors.primary }]}>
                  <Feather name="search" size={24} color={colors.background} />
                </View>
              </View>

              <Text style={styles.findingTitle}>
                {isRide ? "Finding your captain..." : (isHelper ? "Finding your helper..." : "Finding your delivery partner...")}
              </Text>
              <Text style={styles.findingSubtitle}>
                {isRide ? "Scanning nearby captains within your surroundings..." : (isHelper ? "Connecting with qualified task specialists..." : "Scanning nearby delivery partners in your area...")}
              </Text>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBarActive,
                    {
                      transform: [{ translateX }],
                    },
                  ]}
                />
              </View>
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
                  <Text style={styles.driverMotto}>
                    {isRide ? "Loves driving safely" : (isHelper ? "Here to help you with tasks" : "Loves delivering on time")}
                  </Text>
                </View>
                <View style={styles.driverActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]} 
                    onPress={handleSOS}
                  >
                    <Feather name="alert-triangle" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => Linking.openURL(`tel:${driver.phone || "1234567890"}`)}
                  >
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

              {isRide && startOtp && ["confirmed", "driver_assigned", "en_route_pickup", "arrived_pickup"].includes(status) && (
                <View style={styles.otpCard}>
                  <Feather name="shield" size={20} color={colors.primary} />
                  <View style={styles.otpTextContainer}>
                    <Text style={styles.otpTitle}>Start Ride OTP</Text>
                    <Text style={styles.otpSubtitle}>Share this OTP with your captain to start the ride</Text>
                  </View>
                  <View style={styles.otpBadge}>
                    <Text style={styles.otpCode}>{startOtp}</Text>
                  </View>
                </View>
              )}

              {isRide && deliveryOtp && ["en_route_delivery", "arrived_delivery"].includes(status) && (
                <View style={styles.otpCard}>
                  <Feather name="shield" size={20} color={colors.primary} />
                  <View style={styles.otpTextContainer}>
                    <Text style={styles.otpTitle}>End Ride OTP</Text>

                  </View>
                  <View style={styles.otpBadge}>
                    <Text style={styles.otpCode}>{deliveryOtp}</Text>
                  </View>
                </View>
              )}

              {!isRide && deliveryOtp && (
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

              <OrderStatusTimeline currentStatus={status} serviceType={serviceType || undefined} />
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
    width: '100%',
    paddingHorizontal: 24,
  },
  radarContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  radarCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  radarCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
    position: "relative",
    marginTop: 24,
  },
  progressBarActive: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: colors.primary,
    borderRadius: 2,
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
    padding: 8,
    marginBottom: 10,
    gap: 12,
  },
  otpTextContainer: {
    flex: 1,
    gap: 1,
  },
  otpTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  otpSubtitle: {
    fontSize: 9,
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
