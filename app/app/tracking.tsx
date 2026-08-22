import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useDeliveryStore, OrderStatus } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";
import { socketService } from "@/utils/socketService";
import { customFetch } from "@/utils/api/custom-fetch";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";

const RIDE_TYPES = ["bike", "auto", "cab", "cab_prime"];

const STATUS_ORDER: OrderStatus[] = [
  "confirmed",
  "driver_assigned",
  "en_route_pickup",
  "arrived_pickup",
  "picking_items",
  "en_route_delivery",
  "arrived_delivery",
  "delivered",
];

function normalizeStatus(backendStatus: string): OrderStatus {
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
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaLambda = (lng2 - lng1) * rad;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (theta * (180 / Math.PI) + 360) % 360;
}

function calculateDynamicETA(
  driverLoc: { lat: number; lng: number } | null,
  targetLoc: { lat: number; lng: number } | null,
  fallbackEta: number
): number {
  if (!driverLoc || !targetLoc || !driverLoc.lat || !targetLoc.lat) return fallbackEta;
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (targetLoc.lat - driverLoc.lat) * rad;
  const dLng = (targetLoc.lng - driverLoc.lng) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(driverLoc.lat * rad) * Math.cos(targetLoc.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const minutes = Math.round((distanceKm / 22) * 60);
  return Math.max(1, minutes);
}

function formatClock(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} m`;
}

type TimelineStep = { label: string; done: boolean; current: boolean };

/** Collapses the granular backend status enum into the 4-node checklist the
 * design calls for, per service group. Every "done"/"current" flag below is
 * derived from the real order status — nothing here is a fabricated
 * timestamp or invented sub-step. */
function buildTimeline(status: OrderStatus, isRide: boolean, isHelper: boolean): TimelineStep[] {
  const idx = STATUS_ORDER.indexOf(status === "delivered" ? "delivered" : status);
  const at = (s: OrderStatus) => idx >= STATUS_ORDER.indexOf(s);

  if (isRide) {
    const labels = ["Captain assigned", "Heading to pickup", "Trip in progress", "Trip completed"];
    const done = [at("driver_assigned"), at("arrived_pickup"), at("arrived_delivery"), at("delivered")];
    const currentIdx = done.lastIndexOf(false);
    return labels.map((label, i) => ({ label, done: done[i], current: i === currentIdx }));
  }
  if (isHelper) {
    const labels = ["Offer accepted", "Helper arrived", "Task in progress", "Task completed"];
    const done = [at("driver_assigned"), at("arrived_pickup"), at("en_route_delivery"), at("delivered")];
    const currentIdx = done.lastIndexOf(false);
    return labels.map((label, i) => ({ label, done: done[i], current: i === currentIdx }));
  }
  const labels = ["Order placed", "Prepared", "Out for delivery", "Delivered"];
  const done = [true, at("en_route_delivery"), at("arrived_delivery"), at("delivered")];
  const currentIdx = done.lastIndexOf(false);
  return labels.map((label, i) => ({ label, done: done[i], current: i === currentIdx }));
}

function OrderReviewCard({
  orderId,
  isRide,
  isHelper,
  tokens,
  accent,
}: {
  orderId: string;
  isRide: boolean;
  isHelper: boolean;
  tokens: ThemeTokens;
  accent: ThemeTokens["services"]["food"];
}) {
  const styles = useMemo(() => createStyles(tokens, accent), [tokens, accent]);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  const availableTags = isRide
    ? ["On time", "Smooth ride", "Polite captain", "Clean vehicle", "Great route"]
    : isHelper
      ? ["On time", "Careful with items", "Polite", "Hard working"]
      : ["Fast delivery", "Fresh & hot", "Well packaged", "Friendly partner"];

  useEffect(() => {
    if (!orderId) return;
    customFetch<any>(`/api/v1/reviews/order/${orderId}`)
      .then((res) => {
        if (res && res.review) {
          setIsSubmitted(true);
          setExistingReview(res.review);
        }
      })
      .catch(() => {});
  }, [orderId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async () => {
    if (!orderId) return;
    try {
      setIsSubmitting(true);
      const res = await customFetch<any>("/api/v1/reviews", {
        method: "POST",
        body: JSON.stringify({ orderId, rating, comment, tags: selectedTags }),
      });
      if (res) {
        setIsSubmitted(true);
        setExistingReview(res.review || { rating, comment, tags: selectedTags });
      }
    } catch (err: any) {
      Alert.alert("Couldn't submit", err.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && existingReview) {
    return (
      <View style={styles.reviewCard}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.reviewTitle}>Your feedback</Text>
          <View style={styles.submittedPill}>
            <Ionicons name="checkmark" size={12} color={tokens.success} />
            <Text style={[styles.submittedPillText, { color: tokens.success }]}>Submitted</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name="star" size={20} color={star <= existingReview.rating ? "#F59E0B" : tokens.border} />
          ))}
        </View>
        {existingReview.tags?.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {existingReview.tags.map((tag: string, idx: number) => (
              <View key={idx} style={[styles.reviewTagChip, { backgroundColor: accent.skin }]}>
                <Text style={[styles.reviewTagChipText, { color: accent.accent }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {existingReview.comment ? <Text style={styles.reviewComment}>"{existingReview.comment}"</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.reviewCard}>
      <Text style={[styles.reviewTitle, { alignSelf: "center" }]}>Rate your experience</Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12, alignSelf: "center" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
            <Ionicons name="star" size={32} color={star <= rating ? "#F59E0B" : tokens.border} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 16, justifyContent: "center" }}>
        {availableTags.map((tag) => {
          const selected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.reviewTagChip, { backgroundColor: selected ? accent.skin : tokens.surface, borderWidth: 1, borderColor: selected ? accent.accent : tokens.borderStrong }]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.reviewTagChipText, { color: selected ? accent.accent : tokens.sec }]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.reviewCommentInput}
        placeholder="Write a comment (optional)"
        placeholderTextColor={tokens.muted}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TouchableOpacity
        style={[styles.reviewSubmitBtn, { backgroundColor: accent.accent, opacity: isSubmitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={[styles.reviewSubmitBtnText, { color: accent.on }]}>{isSubmitting ? "Submitting…" : "Submit rating"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const {
    status,
    setStatus,
    currentOrderId,
    setOrderId,
    serviceType,
    setServiceType,
    route,
    setRoute,
    stops,
    setStops,
    driver,
    setDriver,
    unreadCount,
    resetDelivery,
  } = useDeliveryStore();

  const { theme } = useThemeStore();
  const tokens = designTokens[theme];

  const isRide = RIDE_TYPES.includes(serviceType?.toLowerCase() || "");
  const isHelper = serviceType?.toLowerCase() === "helper";

  const [vendorName, setVendorName] = useState<string | null>(null);
  const [vendorPartnerType, setVendorPartnerType] = useState<string | null>(null);
  const accentKey: keyof ThemeTokens["services"] = isRide
    ? "ride"
    : isHelper
      ? "task"
      : vendorPartnerType === "meat"
        ? "meat"
        : vendorName
          ? "food"
          : "delivery";
  const accent = tokens.services[accentKey];
  const styles = useMemo(() => createStyles(tokens, accent), [theme, accentKey]);

  const [eta, setEta] = useState(15);
  const [orderCreatedAt, setOrderCreatedAt] = useState<Date | null>(null);
  const [deliveredAt, setDeliveredAt] = useState<Date | null>(null);
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [helperStatus, setHelperStatus] = useState<string>("");
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [startOtp, setStartOtp] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const mapRef = useRef<MapBackgroundRef>(null);

  const cancellationAlerted = useRef(false);

  const handleOrderCancelledByDriver = () => {
    if (cancellationAlerted.current) return;
    cancellationAlerted.current = true;
    resetDelivery();
    router.replace("/(tabs)");
    setTimeout(() => {
      Alert.alert("Order cancelled", "We're sorry — this order could not be completed and has been cancelled.", [{ text: "OK", onPress: () => {} }], { cancelable: true });
    }, 500);
  };

  const handleSOS = () => {
    if (!currentOrderId) return;
    Alert.alert(
      "Emergency SOS",
      "This will instantly alert our support team and your emergency contacts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Trigger SOS",
          style: "destructive",
          onPress: async () => {
            try {
              await customFetch(`/api/v1/orders/${currentOrderId}/sos`, { method: "POST" });
              Alert.alert("SOS dispatched", "Your emergency alert has been sent. Support is on the way.");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to trigger SOS. Please call emergency services.");
            }
          },
        },
      ]
    );
  };

  const handleShareTrip = async () => {
    try {
      await Share.share({
        message: `I'm on a Flavour ${isRide ? "ride" : "trip"}${driver?.name ? ` with ${driver.name}` : ""}. Heading to ${stops?.[stops.length - 1]?.address || "my destination"}.`,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  // Radar / pulse animation shown only while no driver is assigned yet.
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (driver) return;
    const createPulse = (value: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(value, { toValue: 1, duration: 2000, useNativeDriver: true })]));
    const a1 = createPulse(pulse1, 0);
    const a2 = createPulse(pulse2, 1000);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [driver]);

  useEffect(() => {
    if (cancellationAlerted.current) return;
    if (params.orderId && params.orderId !== currentOrderId) setOrderId(params.orderId);
  }, [params.orderId, currentOrderId]);

  useEffect(() => {
    if (status === "cancelled") handleOrderCancelledByDriver();
  }, [status]);

  const deliveryStop = stops?.find((s) => s.type?.toLowerCase() === "delivery" || s.type?.toLowerCase() === "drop");
  const pickupStop = stops?.find((s) => s.type?.toLowerCase() === "pickup" || s.type?.toLowerCase() === "store");

  useEffect(() => {
    if (!currentOrderId) return;

    const fetchOrderDetails = () => {
      customFetch<any>(`/api/v1/orders/${currentOrderId}`)
        .then((order) => {
          if (!order) return;
          if (order.status) {
            const statusStr = String(order.status).toLowerCase();
            if (statusStr === "cancelled" || statusStr === "cancelled_by_driver") {
              handleOrderCancelledByDriver();
              return;
            }
            const normalized = normalizeStatus(order.status);
            setStatus(normalized);
            if (normalized === "delivered") setDeliveredAt((prev) => prev || new Date());
          }
          if (order.driver) {
            setDriver({
              id: order.driver._id,
              name: order.driver.name || order.driver.user?.name || order.driver.firstName || "Driver",
              phone: order.driver.phone || order.driver.user?.phone || "",
              vehicle: order.driver.vehicleType || "unknown",
            });
            if (order.driver.currentLocation?.coordinates) {
              const coords = order.driver.currentLocation.coordinates;
              if (coords[0] != null && coords[1] != null) {
                setDriverLocation((prev) => {
                  const lat = coords[1];
                  const lng = coords[0];
                  if (!prev || Math.abs(prev.lat - lat) > 0.00001 || Math.abs(prev.lng - lng) > 0.00001) {
                    const heading = prev && (prev.lat !== lat || prev.lng !== lng) ? calculateBearing(prev.lat, prev.lng, lat, lng) : prev?.heading || 0;
                    return { lat, lng, heading };
                  }
                  return prev;
                });
              }
            }
          }
          if (order.vendor && typeof order.vendor === "object") {
            setVendorName(order.vendor.name || null);
            setVendorPartnerType(order.vendor.partnerType || null);
          }
          if (order.stops?.length > 0) {
            setStops(
              order.stops.map((s: any) => ({
                id: s._id,
                address: s.address,
                lat: s.location.coordinates[1],
                lng: s.location.coordinates[0],
                type: s.type,
                items: s.items?.lines || [],
              }))
            );
          }
          if (order.radius) setRadius(order.radius);
          if (order.deliveryOtp) setDeliveryOtp(order.deliveryOtp);
          if (order.serviceType) setServiceType(order.serviceType);
          if (order.restaurantPickupCode) setStartOtp(order.restaurantPickupCode);
          if (order.totalPrice != null) setTotalPrice(order.totalPrice);
          if (order.createdAt) setOrderCreatedAt((prev) => prev || new Date(order.createdAt));
          if (order.duration) {
            const durMinutes = parseInt(order.duration.toString().replace(/[^0-9]/g, ""), 10) || 15;
            setEta(durMinutes);
          }
          if (order.polyline) {
            setRoute({ totalDistance: order.totalDistance || 0, estimatedTime: order.duration || 15, polyline: order.polyline });
          }
        })
        .catch((err) => console.error("Error fetching order in tracking:", err));
    };

    fetchOrderDetails();
    const interval = setInterval(fetchOrderDetails, 7000);
    return () => clearInterval(interval);
  }, [currentOrderId]);

  useEffect(() => {
    if (!currentOrderId) return;
    socketService.connect();
    socketService.trackOrder(currentOrderId);

    const onOrderAccepted = (data: any) => {
      setDriver(data.driver);
      setStatus("driver_assigned");
    };

    const onLocationUpdate = (data: any) => {
      if (data.lat == null || data.lng == null) return;
      setDriverLocation((prev) => {
        let heading = data.heading;
        if (!heading && prev) {
          const dLat = Math.abs(prev.lat - data.lat);
          const dLng = Math.abs(prev.lng - data.lng);
          heading = dLat > 0.00001 || dLng > 0.00001 ? calculateBearing(prev.lat, prev.lng, data.lat, data.lng) : prev.heading;
        }
        return { lat: data.lat, lng: data.lng, heading: heading || 0 };
      });

      const activeStop =
        status === "pending" || status === "confirmed" || status === "driver_assigned" || status === "en_route_pickup" || status === "arrived_pickup"
          ? pickupStop || stops?.[0]
          : deliveryStop || stops?.[stops.length - 1];
      if (activeStop && activeStop.lat != null && activeStop.lng != null) {
        setEta(calculateDynamicETA({ lat: data.lat, lng: data.lng }, { lat: Number(activeStop.lat), lng: Number(activeStop.lng) }, eta));
      }
    };

    const onStatusUpdate = (data: any) => {
      if (!data.status) return;
      const statusStr = String(data.status).toLowerCase();
      if (statusStr === "cancelled" || statusStr === "cancelled_by_driver") {
        handleOrderCancelledByDriver();
        return;
      }
      const normalized = normalizeStatus(data.status);
      setStatus(normalized);
      if (normalized === "delivered") setDeliveredAt((prev) => prev || new Date());
    };

    const onOrderCancelled = () => handleOrderCancelledByDriver();
    const onHelperStatusUpdate = (data: { text: string }) => {
      if (data.text) setHelperStatus(data.text);
    };

    socketService.on("order_accepted", onOrderAccepted);
    socketService.on("driver_location_update", onLocationUpdate);
    socketService.on("order_status_update", onStatusUpdate);
    socketService.on("order_cancelled", onOrderCancelled);
    socketService.on("helper_status_update", onHelperStatusUpdate);

    const timer = setInterval(() => setEta((prev) => Math.max(1, prev - 1)), 30000);

    return () => {
      clearInterval(timer);
      socketService.off("order_accepted", onOrderAccepted);
      socketService.off("driver_location_update", onLocationUpdate);
      socketService.off("order_status_update", onStatusUpdate);
      socketService.off("order_cancelled", onOrderCancelled);
      socketService.off("helper_status_update", onHelperStatusUpdate);
    };
  }, [currentOrderId]);

  const handleBack = () => router.replace("/(tabs)/orders");
  const userLocCoords = deliveryStop ? { lat: Number(deliveryStop.lat), lng: Number(deliveryStop.lng) } : null;

  // ---------------------------------------------------------------------
  // Completed state
  // ---------------------------------------------------------------------
  if (status === "delivered") {
    const foodItems = deliveryStop?.items || [];
    const elapsed = orderCreatedAt && deliveredAt ? formatDuration(deliveredAt.getTime() - orderCreatedAt.getTime()) : null;
    const headline = isRide ? "Ride completed" : isHelper ? "Task complete" : "Order delivered";
    const subline = isRide
      ? `You arrived safely${driver?.name ? ` with ${driver.name}` : ""}.`
      : isHelper
        ? `${driver?.name || "Your helper"} finished the task${elapsed ? ` in ${elapsed}` : ""}.`
        : `Delivered by ${driver?.name || "your delivery partner"}${elapsed ? ` in ${elapsed}` : ""}.`;

    return (
      <View style={[styles.doneRoot, { paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.doneHead}>
          <View style={styles.doneCheck}>
            <Ionicons name="checkmark" size={moderateScale(28)} color="#fff" />
          </View>
          <Text style={styles.doneTitle}>{headline}</Text>
          <Text style={styles.doneSubtitle}>{subline}</Text>
          {totalPrice != null && <Text style={styles.donePrice}>₹{Math.round(totalPrice)} paid</Text>}
        </View>

        <ScrollView style={{ flex: 1, width: "100%" }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {isRide ? (
            <View style={styles.doneCard}>
              <Text style={styles.doneCardTitle}>Route</Text>
              <View style={{ gap: 8, paddingVertical: 4 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={[styles.dotSmall, { backgroundColor: tokens.success }]} />
                  <Text style={styles.doneAddrText} numberOfLines={2}>{stops?.find((s) => s.type === "pickup")?.address || "Pickup location"}</Text>
                </View>
                <View style={{ width: 2, height: 12, backgroundColor: tokens.border, marginLeft: 3 }} />
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={[styles.dotSmall, { backgroundColor: tokens.error, borderRadius: 2 }]} />
                  <Text style={styles.doneAddrText} numberOfLines={2}>{deliveryStop?.address || "Destination"}</Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.doneCard}>
                <Text style={styles.doneCardTitle}>{isHelper ? "Task details" : "Delivered items"}</Text>
                {isHelper ? (
                  <Text style={styles.doneAddrText}>Booked location: {stops?.[0]?.address || "—"}</Text>
                ) : foodItems.length > 0 ? (
                  foodItems.map((item: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                      <Text style={[styles.doneAddrText, { fontFamily: fontFamilies.body.bold, color: accent.accent }]}>{item.quantity}x</Text>
                      <Text style={styles.doneAddrText}>{item.name}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.doneAddrText}>Items successfully handed over.</Text>
                )}
              </View>
              {deliveryStop?.address && (
                <View style={styles.doneCard}>
                  <Text style={styles.doneCardTitle}>Delivery address</Text>
                  <Text style={styles.doneAddrText}>{deliveryStop.address}</Text>
                </View>
              )}
            </>
          )}

          <OrderReviewCard orderId={currentOrderId || ""} isRide={isRide} isHelper={isHelper} tokens={tokens} accent={accent} />
          <View style={{ height: 8 }} />
        </ScrollView>

        <View style={{ width: "100%", paddingHorizontal: 20, paddingTop: 8 }}>
          <TouchableOpacity style={[styles.doneHomeBtn, { backgroundColor: accent.accent }]} onPress={handleBack}>
            <Text style={[styles.doneHomeBtnText, { color: accent.on }]}>Back to orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------
  // Live tracking state
  // ---------------------------------------------------------------------
  let bannerText = isHelper ? "Helper is on the way" : isRide ? "Captain on the way" : "Heading to pickup";
  if (status === "arrived_pickup") bannerText = isRide ? "Captain has arrived" : isHelper ? "Helper has arrived" : "Arrived at the store";
  else if (status === "en_route_delivery") bannerText = isRide ? "Trip in progress" : isHelper ? "Task in progress" : "Out for delivery";
  else if (status === "arrived_delivery") bannerText = isRide ? "Arrived at destination" : "Arrived at your location";

  const timeline = buildTimeline(status, isRide, isHelper);
  const pickupLabel = vendorName || pickupStop?.address || stops?.[0]?.address || "Pickup location";

  return (
    <View style={styles.root}>
      <MapBackground
        ref={mapRef}
        stops={stops}
        polyline={["en_route_delivery", "arrived_delivery"].includes(status) ? route?.polyline : undefined}
        driverLocation={driverLocation}
        userLocation={userLocCoords}
        radiusCenter={stops?.[0]?.lat !== undefined && stops?.[0]?.lng !== undefined ? { lat: stops[0].lat, lng: stops[0].lng } : null}
        radiusMeters={radius ? radius * 1000 : undefined}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 24) + (Platform.OS === "web" ? 67 : 0) + 12 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <View style={[styles.etaChip, { backgroundColor: accent.accent }]}>
          <Text style={[styles.etaChipText, { color: accent.on }]}>{status === "arrived_pickup" || status === "arrived_delivery" ? bannerText : `${bannerText} · ${eta} min`}</Text>
        </View>
        <View style={{ width: moderateScale(40) }} />
      </View>

      <BottomSheet style={styles.bottomSheet} defaultHeight={Dimensions.get("window").height * 0.5} disableExpand={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {!driver ? (
            <View style={styles.findingWrap}>
              <View style={styles.radarWrap}>
                <Animated.View style={[styles.radarRing, { borderColor: accent.accent, transform: [{ scale: pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }], opacity: pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) }]} />
                <Animated.View style={[styles.radarRing, { borderColor: accent.accent, transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }], opacity: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) }]} />
                <View style={[styles.radarCenter, { backgroundColor: accent.accent }]}>
                  <Ionicons name="search" size={22} color={accent.on} />
                </View>
              </View>
              <Text style={styles.findingTitle}>{isRide ? "Finding your captain…" : isHelper ? "Finding your helper…" : "Finding your delivery partner…"}</Text>
              <Text style={styles.findingSubtitle}>This usually takes under a minute.</Text>
            </View>
          ) : (
            <>
              {/* Timeline */}
              <View style={styles.timelineBlock}>
                {timeline.map((step, i) => (
                  <View key={step.label} style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ alignItems: "center" }}>
                      {step.done ? (
                        <View style={[styles.stepDotDone, { backgroundColor: accent.accent }]}>
                          <Ionicons name="checkmark" size={11} color={accent.on} />
                        </View>
                      ) : step.current ? (
                        <View style={styles.stepDotCurrentWrap}>
                          <View style={[styles.stepDotCurrentPulse, { backgroundColor: accent.accent }]} />
                          <View style={[styles.stepDotCurrent, { backgroundColor: accent.accent }]} />
                        </View>
                      ) : (
                        <View style={styles.stepDotFuture} />
                      )}
                      {i < timeline.length - 1 && <View style={[styles.stepLine, { backgroundColor: step.done ? accent.accent : tokens.borderStrong }]} />}
                    </View>
                    <View style={{ paddingBottom: 14 }}>
                      <Text style={[styles.stepLabel, { color: step.current ? accent.accent : step.done ? tokens.text : tokens.muted }]}>{step.label}</Text>
                      {i === 0 && orderCreatedAt && <Text style={styles.stepSub}>{formatClock(orderCreatedAt)}</Text>}
                      {step.current && !isHelper && <Text style={styles.stepSub}>{eta} min away</Text>}
                      {step.current && isHelper && helperStatus ? <Text style={styles.stepSub}>{helperStatus}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>

              {/* Partner card */}
              <View style={styles.partnerRow}>
                <View style={styles.partnerAvatar}>
                  <Ionicons name="person" size={22} color={tokens.sec} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.partnerName} numberOfLines={1}>{driver.name || "Assigned partner"}</Text>
                  <Text style={styles.partnerMeta}>{driver.vehicle && driver.vehicle !== "unknown" ? driver.vehicle.charAt(0).toUpperCase() + driver.vehicle.slice(1) : isHelper ? "Helper" : "Delivery partner"}</Text>
                </View>
                <TouchableOpacity style={[styles.circleBtn, { backgroundColor: accent.accent }]} onPress={() => Linking.openURL(`tel:${driver.phone || ""}`)}>
                  <Ionicons name="call" size={17} color={accent.on} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleBtnOutline} onPress={() => router.push("/chat")}>
                  <Ionicons name="chatbubble-outline" size={17} color={tokens.text} />
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: tokens.error }]}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* PIN blocks */}
              {isRide && startOtp && ["confirmed", "driver_assigned", "en_route_pickup", "arrived_pickup"].includes(status) && (
                <View style={[styles.pinCard, { backgroundColor: accent.skin, borderColor: accent.accent }]}>
                  <Text style={[styles.pinLabel, { color: accent.accent }]}>Start ride PIN</Text>
                  <View style={styles.pinBoxes}>
                    {String(startOtp).split("").map((digit, i) => (
                      <View key={i} style={[styles.pinBox, { borderColor: accent.accent }]}>
                        <Text style={styles.pinDigit}>{digit}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.pinHint}>Give this to your captain to start the trip.</Text>
                </View>
              )}
              {isRide && deliveryOtp && status === "arrived_delivery" && (
                <View style={[styles.pinCard, { backgroundColor: accent.skin, borderColor: accent.accent }]}>
                  <Text style={[styles.pinLabel, { color: accent.accent }]}>End ride PIN</Text>
                  <View style={styles.pinBoxes}>
                    {String(deliveryOtp).split("").map((digit, i) => (
                      <View key={i} style={[styles.pinBox, { borderColor: accent.accent }]}>
                        <Text style={styles.pinDigit}>{digit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {!isRide && !isHelper && deliveryOtp && (
                <View style={[styles.pinCard, { backgroundColor: accent.skin, borderColor: accent.accent }]}>
                  <Text style={[styles.pinLabel, { color: accent.accent }]}>Delivery PIN</Text>
                  <View style={styles.pinBoxes}>
                    {String(deliveryOtp).split("").map((digit, i) => (
                      <View key={i} style={[styles.pinBox, { borderColor: accent.accent }]}>
                        <Text style={styles.pinDigit}>{digit}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.pinHint}>Only give this code when your items are safely received.</Text>
                </View>
              )}

              {/* Helper live status */}
              {isHelper && helperStatus ? (
                <View style={[styles.helperUpdate, { backgroundColor: accent.skin }]}>
                  <Text style={[styles.helperUpdateLabel, { color: accent.accent }]}>Helper update</Text>
                  <Text style={styles.helperUpdateText}>{helperStatus}</Text>
                </View>
              ) : null}

              {/* Addresses */}
              <View style={styles.addrCard}>
                <View style={styles.addrRail}>
                  <View style={[styles.addrDot, { borderColor: accent.accent }]} />
                  <View style={styles.addrLine} />
                  <View style={[styles.addrDot, { backgroundColor: tokens.text, borderWidth: 0 }]} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
                  <View>
                    <Text style={styles.addrLabel}>{isRide ? "Pickup" : "Picked up from"}</Text>
                    <Text style={styles.addrText} numberOfLines={1}>{pickupLabel}</Text>
                  </View>
                  <View>
                    <Text style={styles.addrLabel}>{isRide ? "Drop-off" : "Delivering to"}</Text>
                    <Text style={styles.addrText} numberOfLines={1}>{deliveryStop?.address || stops?.[stops.length - 1]?.address || "—"}</Text>
                  </View>
                </View>
              </View>

              {/* Footer actions */}
              {isRide ? (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={styles.footerBtnOutline} onPress={handleShareTrip}>
                    <Text style={styles.footerBtnOutlineText}>Share trip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.footerBtnOutline, { borderColor: tokens.error }]} onPress={handleSOS}>
                    <Text style={[styles.footerBtnOutlineText, { color: tokens.error }]}>Emergency</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={styles.footerBtnOutline} onPress={() => setTripModalVisible(true)}>
                    <Text style={styles.footerBtnOutlineText}>Order details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.footerBtnOutline, { borderColor: tokens.error }]} onPress={handleSOS}>
                    <Text style={[styles.footerBtnOutlineText, { color: tokens.error }]}>Help</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 12 }} />
            </>
          )}
        </ScrollView>
      </BottomSheet>

      <Modal visible={tripModalVisible} animationType="slide" transparent onRequestClose={() => setTripModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setTripModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Order details</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 20 }}>
              <View style={styles.addrRail}>
                <View style={[styles.addrDot, { borderColor: accent.accent }]} />
                <View style={styles.addrLine} />
                <View style={[styles.addrDot, { backgroundColor: tokens.text, borderWidth: 0 }]} />
              </View>
              <View style={{ flex: 1, gap: 20 }}>
                <View>
                  <Text style={styles.addrLabel}>PICKUP</Text>
                  <Text style={[styles.addrText, { marginTop: 2 }]}>{pickupLabel}</Text>
                </View>
                <View>
                  <Text style={styles.addrLabel}>DROP-OFF</Text>
                  <Text style={[styles.addrText, { marginTop: 2 }]}>{stops?.[stops.length - 1]?.address || "—"}</Text>
                </View>
              </View>
            </View>
            <View style={styles.modalOrderIdRow}>
              <Text style={styles.addrLabel}>ORDER ID</Text>
              <Text style={styles.modalOrderIdValue}>{currentOrderId?.substring(0, 8).toUpperCase()}</Text>
            </View>
            {totalPrice != null && (
              <View style={styles.modalOrderIdRow}>
                <Text style={styles.addrLabel}>TOTAL</Text>
                <Text style={styles.modalOrderIdValue}>₹{Math.round(totalPrice)}</Text>
              </View>
            )}
            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10, paddingHorizontal: 16 },
    backBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    },
    etaChip: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
    etaChipText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13) },

    bottomSheet: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 0 },

    findingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 28 },
    radarWrap: { width: 110, height: 110, alignItems: "center", justifyContent: "center", marginBottom: 18 },
    radarRing: { position: "absolute", width: 76, height: 76, borderRadius: 999, borderWidth: 2 },
    radarCenter: { width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center" },
    findingTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(19), color: tokens.text, textAlign: "center" },
    findingSubtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.sec, marginTop: 6, textAlign: "center" },

    timelineBlock: { paddingTop: 14, marginBottom: 8 },
    stepDotDone: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    stepDotCurrentWrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
    stepDotCurrentPulse: { position: "absolute", width: 20, height: 20, borderRadius: 10, opacity: 0.3 },
    stepDotCurrent: { width: 11, height: 11, borderRadius: 6 },
    stepDotFuture: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: tokens.borderStrong, backgroundColor: tokens.surface },
    stepLine: { width: 2, flex: 1, minHeight: 16, marginTop: 2 },
    stepLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14) },
    stepSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

    partnerRow: {
      flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, marginBottom: 10,
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: tokens.border,
    },
    partnerAvatar: { width: 46, height: 46, borderRadius: 999, backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    partnerName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    partnerMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },
    circleBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
    circleBtnOutline: { width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: tokens.borderStrong, alignItems: "center", justifyContent: "center", position: "relative" },
    badge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: tokens.surface, paddingHorizontal: 2 },
    badgeText: { color: "#fff", fontSize: 9, fontFamily: fontFamilies.body.bold },

    pinCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
    pinLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase" },
    pinBoxes: { flexDirection: "row", gap: 8, marginTop: 10 },
    pinBox: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: tokens.surface },
    pinDigit: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(18), color: tokens.text },
    pinHint: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(12), color: tokens.sec, marginTop: 10, lineHeight: 17 },

    helperUpdate: { borderRadius: 14, padding: 13, marginBottom: 14 },
    helperUpdateLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase" },
    helperUpdateText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text, marginTop: 4 },

    addrCard: { flexDirection: "row", gap: 12, backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 14, marginBottom: 16 },
    addrRail: { width: 12, alignItems: "center", paddingTop: 4 },
    addrDot: { width: 9, height: 9, borderRadius: 999, borderWidth: 2.5 },
    addrLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: tokens.borderStrong, marginVertical: 4 },
    addrLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    addrText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text, marginTop: 3 },

    footerBtnOutline: { flex: 1, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    footerBtnOutlineText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.sec },

    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    modalContent: { backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: tokens.borderStrong, alignSelf: "center", marginBottom: 14 },
    modalTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(20), color: tokens.text },
    modalOrderIdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: tokens.border, paddingVertical: 14 },
    modalOrderIdValue: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: tokens.text },

    // Completed screen
    doneRoot: { flex: 1, backgroundColor: tokens.bg, alignItems: "center" },
    doneHead: { alignItems: "center", paddingHorizontal: 24, marginBottom: 8 },
    doneCheck: { width: 64, height: 64, borderRadius: 999, backgroundColor: tokens.success, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    doneTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.3, color: tokens.text, textAlign: "center" },
    doneSubtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
    donePrice: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text, marginTop: 8 },
    doneCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 16, marginTop: 14 },
    doneCardTitle: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 0.6, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },
    doneAddrText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), lineHeight: moderateScale(19), color: tokens.text },
    dotSmall: { width: 8, height: 8, borderRadius: 4 },
    doneHomeBtn: { borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    doneHomeBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15) },

    reviewCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 16, marginTop: 14 },
    reviewTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(17), color: tokens.text },
    submittedPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: tokens.successSkin, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    submittedPillText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(11) },
    reviewTagChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    reviewTagChipText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12) },
    reviewComment: { fontFamily: fontFamilies.body.regular, fontStyle: "italic", fontSize: moderateScale(13), color: tokens.sec, marginTop: 10 },
    reviewCommentInput: {
      borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 12, fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13),
      color: tokens.text, marginTop: 14, minHeight: 60, textAlignVertical: "top",
    },
    reviewSubmitBtn: { borderRadius: 14, minHeight: moderateScale(50), alignItems: "center", justifyContent: "center", marginTop: 14 },
    reviewSubmitBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15) },
  });
