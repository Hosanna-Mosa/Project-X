import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Alert, TouchableOpacity, Modal } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { socketService } from "@/utils/socketService";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { MapBackground } from "@/components/MapBackground";

const TIER_LABEL: Record<string, string> = {
  bike: "Bike",
  auto: "Auto",
  cab: "Cab Economy",
  cab_prime: "Cab Prime",
};

const CANCEL_REASONS = ["Waiting too long", "Booked by mistake", "Fare is too high", "Found another ride", "Other"];

export default function FindingDriverScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, isReserved, dateTimeStr } = useLocalSearchParams<{ orderId: string; isReserved?: string; dateTimeStr?: string }>();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.ride;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedDriver, setConfirmedDriver] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);
  const [orderSummary, setOrderSummary] = useState<{ totalPrice?: number; totalDistance?: number; duration?: number; serviceType?: string }>({});

  const sweep = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1000, useNativeDriver: true, isInteraction: false }));
    const pulse = (value: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(value, { toValue: 1, duration: 2600, useNativeDriver: true })]));
    const p1 = pulse(ring1, 0);
    const p2 = pulse(ring2, 800);
    spin.start(); p1.start(); p2.start();
    return () => { spin.stop(); p1.stop(); p2.stop(); };
  }, []);

  useEffect(() => {
    if (!orderId) {
      router.push("/(tabs)");
      return;
    }

    const isReservedVal = isReserved === "true";
    useDeliveryStore.getState().setOrderId(orderId);

    socketService.connect();
    socketService.trackOrder(orderId);

    let pollIntervalId: any;
    let isTransitioned = false;

    const handleTransition = (driverData: any) => {
      if (isTransitioned) return;
      isTransitioned = true;

      if (pollIntervalId) clearInterval(pollIntervalId);
      if (timeoutTimer) clearTimeout(timeoutTimer);

      const { setDriver, setStatus } = useDeliveryStore.getState();

      const driverInfo = driverData
        ? typeof driverData === "object"
          ? {
              id: driverData.id || driverData._id || "unknown",
              name: driverData.name || driverData.user?.name || "Driver",
              phone: driverData.phone || driverData.user?.phone || "",
              vehicle: driverData.vehicle || driverData.vehicleType || "unknown",
            }
          : { id: driverData, name: "Driver", phone: "", vehicle: "unknown" }
        : { id: "unknown", name: "Driver", phone: "", vehicle: "unknown" };

      setDriver(driverInfo);
      setStatus("driver_assigned");

      if (isReservedVal) {
        setConfirmedDriver(driverInfo);
        setBookingConfirmed(true);
      } else {
        router.push({ pathname: "/tracking", params: { orderId } });
      }
    };

    const handleOrderCancelled = () => {
      if (isTransitioned) return;
      isTransitioned = true;
      if (pollIntervalId) clearInterval(pollIntervalId);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      router.replace("/(tabs)");
      setTimeout(() => {
        Alert.alert("Order cancelled", "Driver is unavailable.", [{ text: "OK", onPress: () => {} }], { cancelable: true });
      }, 500);
    };

    const checkOrderStatus = async () => {
      if (isTransitioned) return;
      try {
        const orderData = await customFetch<any>(`/api/v1/orders/${orderId}`, { responseType: "json" });
        if (orderData) {
          if (orderData.serviceType) useDeliveryStore.getState().setServiceType(orderData.serviceType);
          setOrderSummary({
            totalPrice: orderData.totalPrice,
            totalDistance: orderData.totalDistance,
            duration: orderData.duration,
            serviceType: orderData.serviceType,
          });
          if (orderData.stops && orderData.stops.length > 0) {
            const mappedStops = orderData.stops.map((s: any) => ({
              id: s._id,
              address: s.address,
              lat: s.location.coordinates[1],
              lng: s.location.coordinates[0],
              type: s.type,
              items: s.items?.lines || [],
            }));
            setStops((prev) => {
              if (prev && prev.length === mappedStops.length && prev.every((v, i) => v.id === mappedStops[i].id)) return prev;
              return mappedStops;
            });
          }
          if (orderData.status && orderData.status.toUpperCase() === "CANCELLED") {
            handleOrderCancelled();
            return;
          }
          if (orderData.status && orderData.status.toUpperCase() === "DRIVER_ASSIGNED") {
            handleTransition(orderData.driver);
          }
        }
      } catch (err) {
        console.error("Error checking order status:", err);
      }
    };

    checkOrderStatus();
    pollIntervalId = setInterval(checkOrderStatus, 2000);

    const handleOrderAccepted = (data: any) => {
      if (data && String(data.orderId) === String(orderId)) handleTransition(data.driver);
    };
    const handleStatusUpdate = (data: any) => {
      if (data && String(data.orderId) === String(orderId) && data.status?.toUpperCase() === "CANCELLED") handleOrderCancelled();
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
          "No captain found",
          "Sorry, no captains are available to accept your reservation request right now. Please try scheduling again later.",
          [{
            text: "OK",
            onPress: async () => {
              router.replace("/(tabs)");
              if (orderId) {
                try {
                  await customFetch(`/api/v1/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
                } catch (error) {
                  console.error("Failed to cancel order on backend:", error);
                }
              }
            },
          }]
        );
      }, 60000);
    }

    return () => {
      socketService.off("order_accepted", handleOrderAccepted);
      socketService.off("order_status_update", handleStatusUpdate);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [orderId, isReserved, dateTimeStr]);

  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);

  const handleCancel = async () => {
    setShowCancelSheet(false);
    router.push("/(tabs)");
    if (orderId) {
      try {
        await customFetch(`/api/v1/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
      } catch (error) {
        console.error("Failed to cancel order on backend:", error);
      }
    }
  };

  useEffect(() => {
    if (!stops || stops.length === 0) return;
    const pickupStop = stops.find((s) => s.type === "pickup") || stops[0];
    if (!pickupStop?.lat || !pickupStop?.lng) return;

    let active = true;
    const fetchOnlineDrivers = async () => {
      try {
        const queryParams = new URLSearchParams({ latitude: String(pickupStop.lat), longitude: String(pickupStop.lng), radius: "50000" });
        const res = await customFetch<any[]>(`/api/v1/drivers/nearby?${queryParams.toString()}`);
        if (active && Array.isArray(res)) {
          const mapped = res
            .map((drv) => ({
              id: drv._id,
              lat: drv.currentLocation?.coordinates?.[1] || drv.user?.addresses?.[0]?.location?.coordinates?.[1] || pickupStop.lat,
              lng: drv.currentLocation?.coordinates?.[0] || drv.user?.addresses?.[0]?.location?.coordinates?.[0] || pickupStop.lng,
              vehicleType: drv.vehicleType || "bike",
              name: drv.user?.name || "Driver",
            }))
            .filter((d) => d.lat && d.lng);
          setOnlineDrivers(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch nearby drivers in finding-driver:", error);
      }
    };

    fetchOnlineDrivers();
    const interval = setInterval(fetchOnlineDrivers, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [stops]);

  const pickupStop = stops.find((s) => s.type === "pickup");
  const dropStop = stops.find((s) => s.type === "drop");
  const tierLabel = orderSummary.serviceType ? TIER_LABEL[orderSummary.serviceType] || orderSummary.serviceType : null;
  const spin = sweep.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  if (bookingConfirmed && confirmedDriver) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }]}>
        <View style={styles.confirmedIcon}>
          <Ionicons name="checkmark" size={moderateScale(32)} color="#fff" />
        </View>
        <Text style={styles.confirmedTitle}>Booking confirmed</Text>
        <Text style={styles.confirmedSub}>
          A captain has accepted your reserved ride for {dateTimeStr || "the scheduled time"}. We'll notify you 15 minutes before pickup.
        </Text>
        <View style={styles.confirmedCard}>
          <Text style={styles.confirmedCardTitle}>Captain</Text>
          <Text style={styles.confirmedCardRow}>{confirmedDriver.name}</Text>
          <Text style={styles.confirmedCardRowMuted}>{confirmedDriver.vehicle}{confirmedDriver.phone ? ` · ${confirmedDriver.phone}` : ""}</Text>
        </View>
        <TouchableOpacity style={styles.confirmedDoneBtn} onPress={() => router.replace("/(tabs)/orders")}>
          <Text style={styles.confirmedDoneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapBackground stops={stops} driverMarkers={onlineDrivers} style={StyleSheet.absoluteFill} />

      <View style={styles.radarWrap} pointerEvents="none">
        <Animated.View style={[styles.radarRing, { opacity: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }), transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]} />
        <Animated.View style={[styles.radarRing, { opacity: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] }), transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]} />
        <View style={styles.radarDot} />
      </View>

      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={() => setShowCancelSheet(true)}>
        <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
      </TouchableOpacity>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.titleRow}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
          <Text style={styles.title}>Finding your captain</Text>
        </View>
        <Text style={styles.subtitle}>
          {tierLabel ? `Searching ${tierLabel} nearby. ` : "Searching nearby captains. "}Usually under a minute.
        </Text>

        {(orderSummary.totalPrice != null || pickupStop || dropStop) && (
          <View style={styles.routeCard}>
            {orderSummary.totalPrice != null && (
              <View style={styles.routeCardHead}>
                <Text style={styles.routeCardHeadLabel}>Total fare</Text>
                <Text style={styles.routeCardHeadValue}>₹{Math.round(orderSummary.totalPrice)}</Text>
              </View>
            )}
            {(pickupStop || dropStop) && (
              <View style={styles.routeRow}>
                <View style={styles.routeRail}>
                  <View style={styles.routePickupDot} />
                  <View style={styles.routeLine} />
                  <View style={styles.routeDropSquare} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
                  <Text style={styles.routeAddr} numberOfLines={1}>{pickupStop?.address || ""}</Text>
                  <Text style={styles.routeAddr} numberOfLines={1}>{dropStop?.address || ""}</Text>
                </View>
                {(orderSummary.totalDistance != null || orderSummary.duration != null) && (
                  <View style={{ alignItems: "flex-end" }}>
                    {orderSummary.totalDistance != null && <Text style={styles.routeMeta}>{orderSummary.totalDistance.toFixed(1)} km</Text>}
                    {orderSummary.duration != null && <Text style={[styles.routeMeta, { marginTop: 12 }]}>{Math.round(orderSummary.duration)} min</Text>}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {tierLabel && (
          <View style={styles.searchingChip}>
            <Text style={styles.searchingLabel}>Searching</Text>
            <Text style={styles.searchingValue}>{tierLabel}</Text>
          </View>
        )}

        <View style={{ marginTop: "auto" }}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelSheet(true)} activeOpacity={0.85}>
            <Text style={styles.cancelBtnText}>Cancel ride</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showCancelSheet} transparent animationType="slide" onRequestClose={() => setShowCancelSheet(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetScrim} onPress={() => setShowCancelSheet(false)} />
          <View style={[styles.cancelSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.cancelSheetTitle}>Why do you want to cancel?</Text>
            <Text style={styles.cancelSheetSub}>No cancellation fee — we haven't assigned a captain yet.</Text>

            <View style={{ gap: 8, marginBottom: 18 }}>
              {CANCEL_REASONS.map((reason) => {
                const isSelected = cancelReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonRow, isSelected && { borderColor: accent.accent, backgroundColor: accent.skin }]}
                    onPress={() => setCancelReason(reason)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.radioOuter, isSelected && { borderColor: accent.accent }]}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: accent.accent }]} />}
                    </View>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.cancelSheetCancelBtn} onPress={handleCancel} activeOpacity={0.85}>
                <Text style={styles.cancelSheetCancelBtnText}>Cancel my ride</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelSheetKeepBtn, { backgroundColor: accent.accent }]} onPress={() => setShowCancelSheet(false)} activeOpacity={0.9}>
                <Text style={[styles.cancelSheetKeepBtnText, { color: accent.on }]}>Keep searching</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["ride"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    backBtn: {
      position: "absolute", left: 16, zIndex: 10, width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    radarWrap: { position: "absolute", left: "50%", top: "26%", marginLeft: -110, marginTop: -110, width: 220, height: 220, alignItems: "center", justifyContent: "center" },
    radarRing: { position: "absolute", width: 220, height: 220, borderRadius: 999, backgroundColor: accent.accent },
    radarDot: { width: 26, height: 26, borderRadius: 999, backgroundColor: accent.accent, borderWidth: 4, borderColor: tokens.surface },

    sheet: {
      position: "absolute", left: 0, right: 0, bottom: 0, height: "52%",
      backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12,
      borderTopWidth: 1, borderColor: tokens.border,
    },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: tokens.borderStrong, alignSelf: "center", marginBottom: 16 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
    spinner: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: accent.accent, borderTopColor: "transparent" },
    title: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.2, color: tokens.text },
    subtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, marginBottom: 16 },

    routeCard: { backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 14, marginBottom: 12 },
    routeCardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tokens.border },
    routeCardHeadLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    routeCardHeadValue: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.3, color: tokens.text },
    routeRow: { flexDirection: "row", gap: 12, paddingTop: 12 },
    routeRail: { width: 12, alignItems: "center", paddingTop: 5 },
    routePickupDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2.5, borderColor: accent.accent },
    routeDropSquare: { width: 9, height: 9, borderRadius: 2, backgroundColor: tokens.text },
    routeLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: tokens.borderStrong, marginVertical: 3 },
    routeAddr: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },
    routeMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },

    searchingChip: { backgroundColor: accent.skin, borderRadius: 12, padding: 12, marginBottom: 14, alignSelf: "flex-start" },
    searchingLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: accent.accent },
    searchingValue: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text, marginTop: 4 },

    cancelBtn: { borderWidth: 1, borderColor: tokens.error, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    cancelBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.error },

    sheetOverlay: { flex: 1, justifyContent: "flex-end" },
    sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    cancelSheet: { backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20 },
    cancelSheetTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.2, color: tokens.text, marginBottom: 6 },
    cancelSheetSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, marginBottom: 16 },
    reasonRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, minHeight: 48 },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tokens.borderStrong, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    reasonText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    cancelSheetCancelBtn: { flex: 1, borderWidth: 1, borderColor: tokens.error, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    cancelSheetCancelBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.error },
    cancelSheetKeepBtn: { flex: 1, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    cancelSheetKeepBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15) },

    confirmedIcon: { width: 76, height: 76, borderRadius: 999, backgroundColor: tokens.success, alignItems: "center", justifyContent: "center", marginBottom: 22 },
    confirmedTitle: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(26), letterSpacing: -0.3, color: tokens.text, textAlign: "center" },
    confirmedSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, textAlign: "center", marginTop: 12, marginBottom: 24 },
    confirmedCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 20, width: "100%", alignItems: "center", marginBottom: 30 },
    confirmedCardTitle: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },
    confirmedCardRow: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    confirmedCardRowMuted: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec, marginTop: 4 },
    confirmedDoneBtn: { backgroundColor: accent.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 15, width: "100%", alignItems: "center" },
    confirmedDoneBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  });
