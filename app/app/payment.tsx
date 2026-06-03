import React from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { useCartStore } from "@/contexts/cartStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";
import { RazorpayIntegration } from "@/utils/razorpay";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

type VendorDetails = {
  _id: string;
  name: string;
  address: string;
  location?: { coordinates?: number[] };
};

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { items, vendorId, clearCart, getItemCount } = useCartStore();
  const { setOrderId, setStatus, setServiceType } = useDeliveryStore();
  const { user, token } = useAuthStore();
  const [processing, setProcessing] = React.useState(false);
  const [vendor, setVendor] = React.useState<VendorDetails | null>(null);

  const total = Number(params.total || 0);
  const subtotal = Number(params.subtotal || 0);
  const taxes = Number(params.taxes || 0);
  const deliveryFee = Number(params.deliveryFee || 0);
  const address = String(params.address || "");
  const deliveryAddress = React.useMemo(() => {
    try {
      return params.deliveryAddress ? JSON.parse(String(params.deliveryAddress)) : null;
    } catch {
      return null;
    }
  }, [params.deliveryAddress]);
  const dropLat = Number(params.lat || 17.0005);
  const dropLng = Number(params.lng || 81.804);

  React.useEffect(() => {
    const loadVendor = async () => {
      if (!vendorId || !apiUrl) return;
      try {
        const response = await fetch(`${apiUrl}/api/v1/vendors/${vendorId}`);
        if (response.ok) setVendor(await response.json());
      } catch (error) {
        console.warn("Unable to load vendor details", error);
      }
    };
    loadVendor();
  }, [vendorId]);

  const handlePayment = async () => {
    if (!user || !token) {
      Alert.alert("Login required", "Please login before placing your order.");
      return;
    }
    if (!vendorId || items.length === 0) {
      Alert.alert("Cart is empty", "Please add items before paying.");
      return;
    }

    setProcessing(true);
    try {
      const orderResponse = await fetch(`${apiUrl}/api/v1/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const paymentOrder = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(paymentOrder.message || "Failed to start payment");

      const paymentResult = await RazorpayIntegration.open({
        key: paymentOrder.key,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: paymentOrder.name || "Precision Logistics",
        order_id: paymentOrder.id,
        prefill: {
          email: user?.email || paymentOrder.prefill?.email || "customer@example.com",
          contact: user?.phone || "",
        },
        theme: paymentOrder.theme || { color: colors.primary },
      });

      const vendorCoords = vendor?.location?.coordinates;
      const pickupLng = Number(vendorCoords?.[0] ?? dropLng + 0.004);
      const pickupLat = Number(vendorCoords?.[1] ?? dropLat + 0.004);
      const orderItems = items.map((item) => ({
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      }));

      const verifyResponse = await fetch(`${apiUrl}/api/v1/payments/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...paymentResult,
          orderData: {
            serviceType: "delivery",
            vendorId,
            totals: { subtotal, taxes, deliveryFee, total },
            stops: [
              {
                id: "vendor-pickup",
                address: vendor?.address || "Restaurant pickup",
                storeName: vendor?.name || "Restaurant",
                latitude: pickupLat,
                longitude: pickupLng,
                type: "pickup",
                items: [],
              },
              {
                id: "customer-drop",
                address,
                deliveryAddress,
                latitude: dropLat,
                longitude: dropLng,
                type: "drop",
                instructions: params.instructions || "",
                items: orderItems,
              },
            ],
          },
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyData.message || "Payment verification failed");

      const finalOrder = verifyData.order;
      setOrderId(finalOrder._id || finalOrder.id);
      setServiceType("delivery");
      setStatus("confirmed");
      Alert.alert("Order placed", "Payment successful. Your order is now being assigned.");
      router.replace({
        pathname: "/finding-driver",
        params: { orderId: finalOrder._id || finalOrder.id }
      });
    } catch (error: any) {
      console.error("Food payment failed", error);
      Alert.alert("Payment failed", error.message || "Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 42 : 14) }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130 }]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pay Securely</Text>
          <Text style={styles.amount}>Rs.{total}</Text>
          <Text style={styles.mutedText}>Razorpay payment will create your order after verification.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.methodRow}>
            <Feather name="credit-card" size={18} color={colors.primary} />
            <View style={styles.methodText}>
              <Text style={styles.detailText}>Razorpay</Text>
              <Text style={styles.mutedText}>Cards, UPI, wallets and net banking</Text>
            </View>
            <Feather name="check-circle" size={18} color={colors.success} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Final Summary</Text>
          <View style={styles.row}><Text style={styles.label}>Items</Text><Text style={styles.value}>{getItemCount()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>Rs.{subtotal}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Delivery</Text><Text style={styles.value}>{deliveryFee === 0 ? "Free" : `Rs.${deliveryFee}`}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Taxes</Text><Text style={styles.value}>Rs.{taxes}</Text></View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[styles.payButton, processing && styles.disabledButton]} onPress={handlePayment} disabled={processing}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay Rs.{total}</Text>
              <Feather name="shield" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.secureText}>ENCRYPTED AND SECURE TRANSACTION</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  amount: { fontSize: 34, fontWeight: "900", color: colors.text },
  mutedText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  methodText: { flex: 1 },
  detailText: { fontSize: 14, fontWeight: "800", color: colors.text },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, color: colors.textSecondary },
  value: { fontSize: 13, fontWeight: "700", color: colors.text },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  payButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  disabledButton: { opacity: 0.55 },
  payButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secureText: { textAlign: "center", fontSize: 9, fontWeight: "700", color: colors.textMuted, letterSpacing: 1 },
});
