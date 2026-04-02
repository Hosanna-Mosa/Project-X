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
import { RazorpayIntegration } from "@/utils/razorpay";
import { Alert, ActivityIndicator } from "react-native";

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { stops, price, paymentMethod, setStatus, route, resetDelivery, setOrderId } = useDeliveryStore();
  const { user } = useAuthStore();

  const handleConfirm = async () => {
    if (!price || stops.length === 0) return;
    
    setIsProcessing(true);
    try {
      // 1. Create Razorpay Order on Backend
      const orderResponse = await fetch(`http://192.168.1.5:5000/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price.total }),
      });
      const razorpayOrder = await orderResponse.json();

      // 2. Open Razorpay Gateway
      const paymentResult = await RazorpayIntegration.open({
        key: "rzp_test_YourKeyId",
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Precision Logistics",
        order_id: razorpayOrder.id,
        prefill: {
          email: user?.email || "customer@example.com",
          contact: user?.phone || "9999999999",
        },
        theme: { color: Colors.light.primary },
      });

      // 3. Verify Payment
      const verifyResponse = await fetch(`http://192.168.1.5:5000/api/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentResult),
      });

      if (verifyResponse.ok) {
        // 4. Create the final delivery order in DB
        const createOrderResponse = await fetch(`http://192.168.1.5:5000/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id || "anonymous",
            stops: stops.map(s => ({ ...s, items: s.items || [] })),
            totalDistance: route?.totalDistance,
            totalPrice: price.total,
          }),
        });

        if (createOrderResponse.ok) {
          const finalOrder = await createOrderResponse.json();
          setOrderId(finalOrder.id);
          setStatus("confirmed");
          Alert.alert("Success", "Delivery confirmed and paid!");
          router.push("/tracking");
        }
      } else {
        throw new Error("Payment verification failed");
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
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Precision Logistics</Text>
        <TouchableOpacity style={styles.avatarSm}>
          <Feather name="user" size={18} color={Colors.light.primary} />
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
              <Feather name="map-pin" size={24} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No stops added</Text>
            </View>
          ) : (
            <View style={styles.stopsList}>
              {stops.map((stop, i) => (
                <View key={stop.id} style={styles.stopEntry}>
                  <View style={styles.stopTimeline}>
                    <View style={styles.stopDot}>
                      <Feather name="map-pin" size={12} color={Colors.light.primary} />
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
              <Feather name="monitor" size={14} color={Colors.light.textMuted} />
              <Text style={styles.feeName}>Base Fee</Text>
              <Text style={styles.feeAmount}>${price?.baseFee.toFixed(2) ?? "2.00"}</Text>
            </View>
            <View style={styles.feeRow}>
              <Feather name="map-pin" size={14} color={Colors.light.textMuted} />
              <Text style={styles.feeName}>Distance Cost</Text>
              <Text style={styles.feeAmount}>${price?.distanceCost.toFixed(2) ?? "4.50"}</Text>
            </View>
            <View style={styles.feeRow}>
              <Feather name="git-branch" size={14} color={Colors.light.textMuted} />
              <Text style={styles.feeName}>Stop Charges ({stops.length})</Text>
              <Text style={styles.feeAmount}>${price?.stopCharges.toFixed(2) ?? "3.00"}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>${price?.total.toFixed(2) ?? "9.50"}</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={14} color="#F59E0B" />
            <Text style={styles.infoText}>
              Pay stores directly for items upon delivery. This total reflects the logistics service fee only.
            </Text>
          </View>
        </View>

        <View style={styles.paymentRow}>
          <Feather name="credit-card" size={18} color={Colors.light.textSecondary} />
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
              <Feather name="shield" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.secureText}>ENCRYPTED & SECURE TRANSACTION</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
  },
  avatarSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  emptyStops: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontSize: 14,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  stopLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.light.border,
    marginTop: 4,
    minHeight: 20,
  },
  stopInfo: {
    flex: 1,
    gap: 4,
    paddingBottom: 8,
  },
  stopOrderLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.light.textMuted,
    letterSpacing: 1,
  },
  stopStoreName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  stopAddress: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  itemName: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: "500",
  },
  itemPayment: {
    fontSize: 11,
    color: Colors.light.textMuted,
    fontStyle: "italic",
  },
  noItemsText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontStyle: "italic",
  },
  feeRows: {
    gap: 12,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feeName: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.primary,
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
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
  paymentLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.light.textMuted,
    letterSpacing: 0.5,
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  changeLink: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  secureText: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: Colors.light.textMuted,
    letterSpacing: 1,
  },
});
