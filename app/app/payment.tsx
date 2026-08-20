import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";
import { useCartStore } from "@/contexts/cartStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { RazorpayIntegration } from "@/utils/razorpay";

type VendorDetails = { _id: string; name: string; address: string; location?: { coordinates?: number[] } };

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const { items, vendorId, clearCart, getItemCount } = useCartStore();
  const { setOrderId, setStatus, setServiceType } = useDeliveryStore();
  const { user, token } = useAuthStore();

  const [processing, setProcessing] = useState(false);
  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0) || Number(params.subtotal || 0);
  const deliveryFee = params.deliveryFee ? Number(params.deliveryFee) : null;
  const tip = Number(params.tip || 0);
  const discount = Number(params.discount || 0);
  const couponCode = params.couponCode ? String(params.couponCode) : "";
  const total = Math.max(0, Math.round((subtotal + (deliveryFee || 0) + tip - discount) * 100) / 100);
  const vendorName = params.vendorName ? String(params.vendorName) : vendor?.name || "your vendor";

  useEffect(() => {
    if (!vendorId) return;
    customFetch<VendorDetails>(`/api/v1/vendors/${vendorId}`).then(setVendor).catch(() => {});
  }, [vendorId]);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          const activeStr = await AsyncStorage.getItem("active_address");
          if (activeStr) setSelectedAddress(JSON.parse(activeStr));
        } catch (e) {
          console.error("Failed to load active address:", e);
        }
      })();
    }, [])
  );

  const handlePayment = async () => {
    if (!user || !token) {
      Alert.alert("Login required", "Please log in before placing your order.");
      return;
    }
    if (!vendorId || items.length === 0) {
      Alert.alert("Cart is empty", "Please add items before paying.");
      return;
    }
    if (!selectedAddress?.addressLine) {
      Alert.alert("Address required", "Please select a delivery address.");
      router.push("/delivery/saved-addresses");
      return;
    }

    setProcessing(true);
    try {
      const rzpOrderResponse = await customFetch<any>("/api/v1/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: total }),
      });

      const paymentResult = await RazorpayIntegration.open({
        order_id: rzpOrderResponse.id,
        key: rzpOrderResponse.key,
        amount: rzpOrderResponse.amount,
        currency: rzpOrderResponse.currency,
        name: rzpOrderResponse.name,
        prefill: { email: user?.email || rzpOrderResponse.prefill?.email, contact: user?.phone || "" },
        theme: rzpOrderResponse.theme,
      });

      const dropLat = Number(selectedAddress.coordinates?.lat ?? selectedAddress.location?.coordinates?.[1] ?? 17.0005);
      const dropLng = Number(selectedAddress.coordinates?.lng ?? selectedAddress.location?.coordinates?.[0] ?? 81.804);
      const vendorCoords = vendor?.location?.coordinates;
      const pickupLat = Number(vendorCoords?.[1] ?? dropLat + 0.004);
      const pickupLng = Number(vendorCoords?.[0] ?? dropLng + 0.004);
      const orderItems = items.map((item) => ({ id: item._id, name: item.name, quantity: item.quantity, price: item.price, total: item.price * item.quantity }));

      const verifyResponse = await customFetch<any>("/api/v1/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          ...paymentResult,
          orderData: {
            serviceType: "delivery",
            vendorId,
            totals: { subtotal, deliveryFee: deliveryFee || 0, tip, discount, total },
            stops: [
              {
                id: "vendor-pickup",
                address: vendor?.address || "Restaurant pickup",
                storeName: vendorName,
                latitude: pickupLat,
                longitude: pickupLng,
                type: "pickup",
                items: [],
              },
              {
                id: "customer-drop",
                address: selectedAddress.addressLine,
                deliveryAddress: {
                  label: selectedAddress.label || "",
                  addressLine: selectedAddress.addressLine,
                  phone: selectedAddress.phone || "",
                  receiverName: selectedAddress.receiverName || "",
                  formattedAddress: selectedAddress.addressLine,
                },
                latitude: dropLat,
                longitude: dropLng,
                type: "drop",
                items: orderItems,
              },
            ],
          },
        }),
      });

      const finalOrder = verifyResponse.order;
      setOrderId(finalOrder._id || finalOrder.id);
      setServiceType("delivery");
      setStatus("confirmed");
      clearCart();
      router.replace({ pathname: "/finding-driver", params: { orderId: finalOrder._id || finalOrder.id } });
    } catch (error: any) {
      console.error("Payment failed", error);
      Alert.alert("Payment failed", error?.message || "Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitleSolo}>Payment</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 150 }} showsVerticalScrollIndicator={false}>
        <View style={styles.payingBlock}>
          <Text style={styles.payingEyebrow}>Paying</Text>
          <Text style={styles.payingAmount}>₹{total}</Text>
          <Text style={styles.payingSub}>{vendorName} · {getItemCount()} items</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item total</Text>
              <Text style={styles.billValue}>₹{subtotal}</Text>
            </View>
            {deliveryFee != null ? (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery fee</Text>
                <Text style={styles.billValue}>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</Text>
              </View>
            ) : (
              <Text style={styles.billNote}>Delivery fee is confirmed with your order.</Text>
            )}
            {tip > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery tip</Text>
                <Text style={styles.billValue}>₹{tip}</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: tokens.success }]}>Coupon {couponCode}</Text>
                <Text style={[styles.billValue, { color: tokens.success }]}>−₹{discount}</Text>
              </View>
            )}
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotalLabel}>To pay</Text>
              <Text style={styles.billTotalValue}>₹{total}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.addressCard}>
            <View style={styles.addressAvatar}>
              <Text style={styles.addressAvatarText}>{(selectedAddress?.label || "A")[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.addressTitle}>Deliver to {selectedAddress?.label || "…"}</Text>
              <Text style={styles.addressLine} numberOfLines={2}>{selectedAddress?.addressLine || "No address selected"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment</Text>
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}>
              <Ionicons name="card-outline" size={moderateScale(18)} color={tokens.sec} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.methodTitle}>Razorpay</Text>
              <Text style={styles.methodSub}>UPI, cards, wallets and net banking — choose on the next step</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.trustRow}>
            <Ionicons name="lock-closed" size={moderateScale(14)} color={tokens.success} />
            <Text style={styles.trustText}>
              Encrypted and secure transaction. Flavour never sees or stores your card, UPI PIN or bank credentials.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity style={styles.payBtn} activeOpacity={0.9} onPress={handlePayment} disabled={processing}>
          {processing ? (
            <ActivityIndicator size="small" color={accent.on} />
          ) : (
            <>
              <Text style={styles.payBtnText}>Pay securely</Text>
              <Text style={styles.payBtnPrice}>· ₹{total}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitleSolo: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    payingBlock: { alignItems: "center", paddingHorizontal: 16, paddingTop: 18 },
    payingEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    payingAmount: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(44), lineHeight: moderateScale(46), letterSpacing: -0.8, color: tokens.text, marginTop: 8 },
    payingSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 8 },

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },

    billCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 16, gap: 11 },
    billRow: { flexDirection: "row", justifyContent: "space-between" },
    billLabel: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.sec },
    billValue: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    billNote: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.muted },
    billDivider: { borderTopWidth: 1, borderTopColor: tokens.borderStrong, borderStyle: "dashed", marginTop: 3, paddingTop: 1 },
    billTotalLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    billTotalValue: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(17), color: tokens.text },

    addressCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 14 },
    addressAvatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    addressAvatarText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.accent },
    addressTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    addressLine: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 3 },

    methodRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 14, minHeight: 64 },
    methodIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    methodTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    methodSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 2 },

    trustRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: tokens.successSkin, borderRadius: 14, padding: 13 },
    trustText: { flex: 1, fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(19), color: tokens.sec },

    footer: {
      position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: tokens.surface,
      borderTopWidth: 1, borderTopColor: tokens.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 14,
    },
    payBtn: {
      backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52),
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    payBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    payBtnPrice: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on, opacity: 0.85 },
  });
