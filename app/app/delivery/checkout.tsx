import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useAuthStore } from "@/contexts/authStore";
import { RazorpayIntegration } from "@/utils/razorpay";
import { customFetch } from "@/utils/api/custom-fetch";

export default function DeliveryCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.delivery;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [isProcessing, setIsProcessing] = useState(false);
  const { stops, price, route, setStatus, setOrderId, setServiceType, vendorId } = useDeliveryStore();
  const { user, token } = useAuthStore();

  const itemsEstimate = useMemo(
    () => stops.reduce((sum, s) => sum + (s.items || []).reduce((iSum, i) => iSum + (i.estimatedPrice || 0) * i.quantity, 0), 0),
    [stops]
  );
  const deliveryFee = price ? Math.round((price.baseFee + price.distanceCost) * 100) / 100 : 0;
  const stopCharges = price?.stopCharges ?? 0;

  const handleConfirm = async () => {
    if (!user || !token) {
      Alert.alert("Login required", "Please log in to confirm your order.");
      return;
    }
    if (!price || stops.length === 0) return;

    setIsProcessing(true);
    try {
      const rzpOrder = await customFetch<any>("/api/v1/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: price.total }),
      });

      const paymentResult = await RazorpayIntegration.open({
        key: rzpOrder.key,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: rzpOrder.name,
        order_id: rzpOrder.id,
        prefill: { email: user?.email || rzpOrder.prefill?.email, contact: user?.phone || "" },
        theme: rzpOrder.theme,
      });

      const verifyResponse = await customFetch<any>("/api/v1/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          ...paymentResult,
          orderData: {
            stops: stops.map((s) => ({ ...s, items: s.items || [] })),
            totalDistance: route?.totalDistance,
            totalPrice: price.total,
            vendorId,
          },
        }),
      });

      const finalOrder = verifyResponse.order;
      setOrderId(finalOrder._id || finalOrder.id);
      setServiceType("delivery");
      setStatus("confirmed");
      router.push("/tracking");
    } catch (error: any) {
      console.error("Delivery checkout failed:", error);
      Alert.alert("Order failed", error?.message || "Unable to process your order.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <View style={{ minWidth: 0 }}>
          <Text style={styles.headerTitle}>Review route</Text>
          <Text style={styles.headerSub}>
            {stops.length} {stops.length === 1 ? "stop" : "stops"}
            {route?.totalDistance != null ? ` · ${route.totalDistance} km` : ""}
            {route?.estimatedTime != null ? ` · about ${route.estimatedTime} min` : ""}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 150 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Active route</Text>
          {stops.length === 0 ? (
            <View style={styles.emptyStops}>
              <Ionicons name="location-outline" size={20} color={tokens.muted} />
              <Text style={styles.emptyStopsText}>No stops added</Text>
            </View>
          ) : (
            <View style={styles.routeCard}>
              <View style={styles.routeRail}>
                <View style={styles.pickupDot} />
                {stops.map((_, i) => (
                  <React.Fragment key={i}>
                    <View style={styles.railLine} />
                    <View style={styles.stopNumber}><Text style={styles.stopNumberText}>{i + 1}</Text></View>
                  </React.Fragment>
                ))}
                <View style={styles.railLine} />
                <View style={styles.dropSquare} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
                <Text style={styles.routeStartEnd}>Start</Text>
                {stops.map((stop) => (
                  <View key={stop.id}>
                    <Text style={styles.stopName} numberOfLines={1}>{stop.storeName || stop.address}</Text>
                    {stop.items && stop.items.length > 0 && (
                      <Text style={styles.stopMeta}>
                        {stop.items.length} {stop.items.length === 1 ? "item" : "items"}
                        {stop.items.some((i) => i.estimatedPrice != null) ? ` · ₹${stop.items.reduce((s, i) => s + (i.estimatedPrice || 0) * i.quantity, 0)} est.` : ""}
                      </Text>
                    )}
                  </View>
                ))}
                <Text style={styles.routeStartEnd}>Drop</Text>
              </View>
            </View>
          )}
        </View>

        {itemsEstimate > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Store payment</Text>
            <View style={styles.storePaymentCard}>
              <View style={styles.storePaymentRow}>
                <Text style={styles.storePaymentLabel}>Your estimate for items</Text>
                <Text style={styles.storePaymentValue}>₹{itemsEstimate}</Text>
              </View>
              <Text style={styles.storePaymentNote}>
                The rider pays at each counter and shares the bill photo. Items are verified on-site and the difference is settled after delivery — this amount is not charged now.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Delivery charges</Text>
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery fee{route?.totalDistance != null ? ` · ${route.totalDistance} km` : ""}</Text>
              <Text style={styles.billValue}>₹{deliveryFee}</Text>
            </View>
            {stopCharges > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Multi-stop charge · {stops.length} stops</Text>
                <Text style={styles.billValue}>₹{stopCharges}</Text>
              </View>
            )}
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotalLabel}>To pay now</Text>
              <Text style={styles.billTotalValue}>₹{price?.total ?? 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}>
              <Ionicons name="card-outline" size={moderateScale(17)} color={tokens.sec} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.methodTitle}>Razorpay</Text>
              <Text style={styles.methodSub}>UPI, cards, wallets — choose on the next step</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.trustRow}>
          <Ionicons name="lock-closed" size={13} color={tokens.success} />
          <Text style={styles.trustText}>Encrypted and secure transaction · Razorpay</Text>
        </View>
        <TouchableOpacity style={[styles.payBtn, (isProcessing || stops.length === 0) && { opacity: 0.6 }]} onPress={handleConfirm} disabled={isProcessing || stops.length === 0}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={accent.on} />
          ) : (
            <>
              <Text style={styles.payBtnText}>Pay securely</Text>
              <Text style={styles.payBtnPrice}>· ₹{price?.total ?? 0}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["delivery"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    headerSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },

    emptyStops: { alignItems: "center", gap: 8, paddingVertical: 20 },
    emptyStopsText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.muted },

    routeCard: { flexDirection: "row", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 14 },
    routeRail: { width: 18, alignItems: "center", paddingTop: 6, gap: 4 },
    pickupDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: accent.accent },
    railLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: tokens.borderStrong },
    stopNumber: { width: 18, height: 18, borderRadius: 9, backgroundColor: accent.accent, alignItems: "center", justifyContent: "center" },
    stopNumberText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), color: accent.on },
    dropSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: tokens.text },
    routeStartEnd: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },
    stopName: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },
    stopMeta: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

    storePaymentCard: { backgroundColor: tokens.warningSkin, borderRadius: 16, padding: 14 },
    storePaymentRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    storePaymentLabel: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec },
    storePaymentValue: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    storePaymentNote: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec },

    billCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 16, gap: 11 },
    billRow: { flexDirection: "row", justifyContent: "space-between" },
    billLabel: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.sec },
    billValue: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    billDivider: { borderTopWidth: 1, borderTopColor: tokens.borderStrong, borderStyle: "dashed", marginTop: 3, paddingTop: 1 },
    billTotalLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    billTotalValue: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.3, color: tokens.text },

    methodRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 13, minHeight: 60 },
    methodIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    methodTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    methodSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(12), lineHeight: moderateScale(17), color: tokens.sec, marginTop: 2 },

    footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.border, backgroundColor: tokens.surface },
    trustRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginBottom: 10 },
    trustText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec },
    payBtn: {
      backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52),
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    payBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    payBtnPrice: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on, opacity: 0.85 },
  });
