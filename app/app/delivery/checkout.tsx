import React, { useEffect } from "react";
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
import Colors from "@/constants/colors";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";
import { RazorpayIntegration } from "@/utils/razorpay";
import { Alert, ActivityIndicator } from "react-native";
import Constants from "expo-constants";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { stops, price, paymentMethod, setStatus, route, resetDelivery, setOrderId, setServiceType, vendorId } = useDeliveryStore();
  const { user } = useAuthStore();

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please log in to confirm your order.");
      return;
    }
    if (!price || stops.length === 0) return;
    
    setIsProcessing(true);
    try {
      // 1. Create Razorpay Order on Backend
      const orderResponse = await fetch(`${apiUrl}/api/v1/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price.total }),
      });
      const razorpayOrder = await orderResponse.json();

      // 2. Open Razorpay Gateway
      const paymentResult = await RazorpayIntegration.open({
        key: razorpayOrder.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: razorpayOrder.name || "Precision Logistics",
        order_id: razorpayOrder.id,
        prefill: {
          email: user?.email || razorpayOrder.prefill?.email || "customer@example.com",
          contact: user?.phone || "",
        },
        theme: razorpayOrder.theme || { color: colors.primary },
      });

      // 3. Verify Payment AND Create Order
      const verifyResponse = await fetch(`${apiUrl}/api/v1/payments/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          ...paymentResult,
          orderData: {
            stops: stops.map(s => ({ ...s, items: s.items || [] })),
            totalDistance: route?.totalDistance,
            totalPrice: price.total,
            vendorId: vendorId,
          }
        }),
      });

      if (verifyResponse.ok) {
        const data = await verifyResponse.json();
        const finalOrder = data.order;
        setOrderId(finalOrder._id || finalOrder.id);
        setServiceType("delivery");
        setStatus("confirmed");
        Alert.alert("Success", "Delivery confirmed and paid!");
        router.push("/tracking");
      } else {
        throw new Error("Payment verification or order creation failed");
      }
    } catch (error: any) {
      console.error("Order Creation Failed:", error);
      Alert.alert("Error", error.message || "Failed to process order");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Precision Logistics</Text>
        <TouchableOpacity style={styles.avatarSm}>
          <Feather name="user" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 120),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Order Summary</Text>
          <Text style={styles.subtitle}>Review your route and delivery breakdown</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.activeDot} />
            <Text style={styles.cardTitle}>Active Route Stops</Text>
          </View>

          {stops.length === 0 ? (
            <View style={styles.emptyStops}>
              <Feather name="map-pin" size={20} color={colors.textMuted} />
              <Text style={styles.emptyText}>No stops added</Text>
            </View>
          ) : (
            <View style={styles.stopsList}>
              {stops.map((stop, i) => (
                <View key={stop.id} style={styles.stopEntry}>
                  <View style={styles.stopTimeline}>
                    <View style={styles.stopDot}>
                      <Feather name="map-pin" size={10} color={colors.primary} />
                    </View>
                    {i < stops.length - 1 && <View style={styles.stopLine} />}
                  </View>
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopOrderLabel}>STOP {String(i + 1).padStart(2, "0")}</Text>
                    <Text style={styles.stopStoreName}>
                      {stop.storeName || "Stop " + (i + 1)}
                    </Text>
                    <Text style={styles.stopAddress}>{stop.address}</Text>
                    {stop.items && stop.items.map((item, j) => (
                      <View key={j} style={styles.itemRow}>
                        <Text style={styles.itemName}>
                          {item.name} (x{item.quantity})
                        </Text>
                        <Text style={styles.itemPayment}>Store Payment</Text>
                      </View>
                    ))}
                    {(!stop.items || stop.items.length === 0) && (
                      <Text style={styles.noItemsText}>Items to be verified on-site</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Breakdown</Text>
          <View style={styles.feeRows}>
            <View style={styles.feeRow}>
              <Feather name="monitor" size={12} color={colors.textMuted} />
              <Text style={styles.feeName}>Base Fee</Text>
              <Text style={styles.feeAmount}>${price?.baseFee.toFixed(2) ?? "2.00"}</Text>
            </View>
            <View style={styles.feeRow}>
              <Feather name="map-pin" size={12} color={colors.textMuted} />
              <Text style={styles.feeName}>Distance Cost</Text>
              <Text style={styles.feeAmount}>${price?.distanceCost.toFixed(2) ?? "4.50"}</Text>
            </View>
            <View style={styles.feeRow}>
              <Feather name="git-branch" size={12} color={colors.textMuted} />
              <Text style={styles.feeName}>Stop Charges ({stops.length})</Text>
              <Text style={styles.feeAmount}>${price?.stopCharges.toFixed(2) ?? "3.00"}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>${price?.total.toFixed(2) ?? "9.50"}</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={12} color="#F59E0B" />
            <Text style={styles.infoText}>
              Pay stores directly for items upon delivery. This total reflects the logistics service fee only.
            </Text>
          </View>
        </View>

        <View style={styles.paymentRow}>
          <Feather name="credit-card" size={16} color={colors.textSecondary} />
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentLabel}>PAYMENT METHOD</Text>
            <Text style={styles.paymentValue}>•••• {paymentMethod.split(" ").pop()}</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.confirmBtn, isProcessing && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.88}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>Confirm & Pay ${price?.total.toFixed(2) ?? "0.00"}</Text>
              <Feather name="shield" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.secureText}>ENCRYPTED & SECURE TRANSACTION</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  avatarSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.06 : 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  emptyStops: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  stopsList: {
    gap: 16,
  },
  stopEntry: {
    flexDirection: "row",
    gap: 12,
  },
  stopTimeline: {
    alignItems: "center",
    width: 24,
  },
  stopDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  stopLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    minHeight: 20,
  },
  stopInfo: {
    flex: 1,
    gap: 4,
    paddingBottom: 8,
  },
  stopOrderLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1,
  },
  stopStoreName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  stopAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  itemName: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "500",
  },
  itemPayment: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  noItemsText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  feeRows: {
    gap: 12,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feeName: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    color: "#92400E",
    lineHeight: 16,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
  paymentLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  changeLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.textMuted,
    shadowOpacity: 0,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secureText: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
