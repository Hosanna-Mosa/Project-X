import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useCartStore } from "@/contexts/cartStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { RazorpayIntegration } from "@/utils/razorpay";

const TIP_OPTIONS = [0, 20, 30, 50];

export default function FoodCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const { getItemCount, vendorId, items, clearCart } = useCartStore();
  const { user, token } = useAuthStore();
  const { setOrderId, setStatus, setServiceType } = useDeliveryStore();

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCodeText, setPromoCodeText] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number } | null>(
    params.couponCode && Number(params.discount) > 0
      ? { code: String(params.couponCode), discountAmount: Number(params.discount) }
      : null
  );
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const vendorName = params.vendorName ? String(params.vendorName) : "your vendor";

  const [tipAmount, setTipAmount] = useState(0);
  const [isOtherTip, setIsOtherTip] = useState(false);
  const [otherTipText, setOtherTipText] = useState("");

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0) || Number(params.subtotal || 0);
  const deliveryFee = params.deliveryFee ? Number(params.deliveryFee) : null;
  const activeTip = isOtherTip ? Number(otherTipText) || 0 : tipAmount;
  const discount = appliedPromo?.discountAmount || 0;
  const total = Math.max(0, Math.round((subtotal + (deliveryFee || 0) + activeTip - discount) * 100) / 100);

  const handleApplyPromo = async () => {
    if (!promoCodeText.trim()) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      const response = await customFetch<any>("/api/v1/orders/validate-coupon", {
        method: "POST",
        body: JSON.stringify({ code: promoCodeText.trim(), cartTotal: subtotal }),
      });
      let amount = 0;
      if (response.discountType === "PERCENTAGE") {
        amount = (subtotal * response.discountValue) / 100;
        if (response.maxDiscount) amount = Math.min(amount, response.maxDiscount);
      } else {
        amount = response.discountValue;
      }
      setAppliedPromo({ code: response.code, discountAmount: Math.round(amount) });
      setShowPromoInput(false);
      setPromoCodeText("");
    } catch (error: any) {
      setPromoError((error?.message || "Invalid promo code").replace(/^HTTP \d+.*?: /, "").trim());
    } finally {
      setIsApplyingPromo(false);
    }
  };

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

  const placeOrder = async () => {
    if (getItemCount() === 0) {
      Alert.alert("Cart is empty", "Please add at least one item.");
      return;
    }
    if (!user || !token) {
      Alert.alert("Login required", "Please log in before placing your order.");
      router.push("/login");
      return;
    }
    if (!selectedAddress || !selectedAddress.addressLine || !selectedAddress.phone) {
      Alert.alert("Address required", "Please select a delivery address with a contact number.");
      router.push("/delivery/saved-addresses");
      return;
    }
    if (!vendorId) {
      Alert.alert("Restaurant missing", "Please choose a restaurant again.");
      return;
    }

    const deliveryAddressObj = {
      label: selectedAddress.label || "",
      addressLine: selectedAddress.addressLine,
      phone: selectedAddress.phone || "",
      receiverName: selectedAddress.receiverName || "",
      formattedAddress: selectedAddress.addressLine,
    };
    const dropLat = Number(selectedAddress.coordinates?.lat ?? selectedAddress.location?.coordinates?.[1] ?? 17.0005);
    const dropLng = Number(selectedAddress.coordinates?.lng ?? selectedAddress.location?.coordinates?.[0] ?? 81.804);

    setIsPlacingOrder(true);
    try {
      const orderItems = items.map((item) => ({
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        // Kept so "order again" can rebuild the cart with thumbnails.
        image: item.images?.[0],
        isVeg: item.isVeg,
        category: item.category,
      }));

      const orderDataPayload = {
        serviceType: "delivery",
        vendorId,
        totals: { subtotal, deliveryFee: deliveryFee || 0, tip: activeTip, discount, total },
        stops: [
          {
            id: "vendor-pickup",
            address: vendorName || "Restaurant pickup",
            storeName: vendorName || "Restaurant",
            latitude: dropLat + 0.004,
            longitude: dropLng + 0.004,
            type: "pickup",
            items: [],
          },
          {
            id: "customer-drop",
            address: deliveryAddressObj.formattedAddress,
            deliveryAddress: deliveryAddressObj,
            latitude: dropLat,
            longitude: dropLng,
            type: "drop",
            items: orderItems,
          },
        ],
      };

      let finalOrderId: string;

      const rzpOrderResponse = await customFetch<any>("/api/v1/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: total }),
      });

      const rzpResult = await RazorpayIntegration.open({
        order_id: rzpOrderResponse.id,
        key: rzpOrderResponse.key,
        amount: rzpOrderResponse.amount,
        currency: rzpOrderResponse.currency,
        name: rzpOrderResponse.name,
        prefill: rzpOrderResponse.prefill,
        theme: rzpOrderResponse.theme,
      });

      const verifyResponse = await customFetch<any>("/api/v1/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_payment_id: rzpResult.razorpay_payment_id,
          razorpay_order_id: rzpResult.razorpay_order_id,
          razorpay_signature: rzpResult.razorpay_signature,
          orderData: orderDataPayload,
        }),
      });

      finalOrderId = verifyResponse.order._id || verifyResponse.order.id;

      setOrderId(finalOrderId);
      setServiceType("delivery");
      setStatus("pending");
      clearCart();

      router.replace({ pathname: "/finding-driver", params: { orderId: finalOrderId } });
    } catch (error: any) {
      console.error("Place order failed", error);
      Alert.alert("Order failed", error?.message || "Unable to place your order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitleSolo}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 150 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <TouchableOpacity style={styles.addressCard} activeOpacity={0.85} onPress={() => router.push("/delivery/saved-addresses")}>
            <View style={styles.addressAvatar}>
              <Text style={styles.addressAvatarText}>{(selectedAddress?.label || "H")[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.addressTitle}>Deliver to {selectedAddress?.label || "…"}</Text>
              <Text style={styles.addressLine} numberOfLines={2}>
                {selectedAddress?.addressLine || "Select a delivery address"}
              </Text>
              {!!selectedAddress?.receiverName && (
                <Text style={styles.addressContact}>{selectedAddress.receiverName} · {selectedAddress.phone}</Text>
              )}
            </View>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.orderCard}>
            <View style={styles.orderCardHead}>
              <Text style={styles.orderCardTitle}>Your order · {getItemCount()} items</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.changeLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            {items.map((item) => (
              <View key={item._id} style={styles.orderLine}>
                <Text style={styles.orderLineLabel} numberOfLines={1}>{item.quantity} × {item.name}</Text>
                <Text style={styles.orderLineValue}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Offers &amp; coupons</Text>
          {appliedPromo ? (
            <View style={[styles.couponOptionRow, { borderColor: accent.accent, backgroundColor: accent.skin }]}>
              <View style={styles.radioSelected}><View style={[styles.radioDot, { backgroundColor: accent.accent }]} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.couponCode}>{appliedPromo.code}</Text>
                <Text style={styles.couponDesc}>You saved ₹{appliedPromo.discountAmount}</Text>
              </View>
              <TouchableOpacity onPress={() => setAppliedPromo(null)}>
                <Text style={styles.changeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : showPromoInput ? (
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                placeholderTextColor={tokens.muted}
                autoCapitalize="characters"
                value={promoCodeText}
                onChangeText={setPromoCodeText}
              />
              <TouchableOpacity style={styles.promoApplyBtn} onPress={handleApplyPromo} disabled={isApplyingPromo}>
                {isApplyingPromo ? <ActivityIndicator size="small" color={accent.on} /> : <Text style={styles.promoApplyBtnText}>Apply</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.couponOptionRow} activeOpacity={0.85} onPress={() => setShowPromoInput(true)}>
              <Ionicons name="pricetag-outline" size={moderateScale(18)} color={tokens.sec} />
              <Text style={[styles.couponCode, { flex: 1 }]}>Have a promo code?</Text>
              <Text style={styles.changeLink}>Add</Text>
            </TouchableOpacity>
          )}
          {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tip your delivery partner</Text>
          <Text style={styles.tipSub}>100% of the tip goes to the partner.</Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((opt) => {
              const isSelected = !isOtherTip && tipAmount === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.tipPill, isSelected && { backgroundColor: accent.accent, borderColor: accent.accent }]}
                  onPress={() => { setIsOtherTip(false); setTipAmount(opt); }}
                >
                  <Text style={[styles.tipPillText, isSelected && { color: accent.on }]}>{opt === 0 ? "None" : `₹${opt}`}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.tipPill, isOtherTip && { backgroundColor: accent.accent, borderColor: accent.accent }]}
              onPress={() => setIsOtherTip(true)}
            >
              <Text style={[styles.tipPillText, isOtherTip && { color: accent.on }]}>Other</Text>
            </TouchableOpacity>
          </View>
          {isOtherTip && (
            <TextInput
              style={styles.otherTipInput}
              placeholder="Enter amount"
              placeholderTextColor={tokens.muted}
              keyboardType="numeric"
              value={otherTipText}
              onChangeText={setOtherTipText}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bill details</Text>
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
            {activeTip > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery tip</Text>
                <Text style={styles.billValue}>₹{activeTip}</Text>
              </View>
            )}
            {appliedPromo && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: tokens.success }]}>Coupon {appliedPromo.code}</Text>
                <Text style={[styles.billValue, { color: tokens.success }]}>−₹{appliedPromo.discountAmount}</Text>
              </View>
            )}
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotalLabel}>To pay</Text>
              <Text style={styles.billTotalValue}>₹{total}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity style={styles.placeOrderBtn} activeOpacity={0.9} onPress={placeOrder} disabled={isPlacingOrder}>
          {isPlacingOrder ? (
            <ActivityIndicator size="small" color={accent.on} />
          ) : (
            <>
              <Text style={styles.placeOrderBtnText}>Place order</Text>
              <Text style={styles.placeOrderBtnPrice}>· ₹{total}</Text>
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

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 12 },

    addressCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 14 },
    addressAvatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    addressAvatarText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.accent },
    addressTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    addressLine: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, marginTop: 3 },
    addressContact: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 5 },
    changeLink: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), letterSpacing: 0.5, textTransform: "uppercase", color: accent.accent, flexShrink: 0 },

    orderCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 14 },
    orderCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    orderCardTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    orderLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
    orderLineLabel: { flex: 1, fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), color: tokens.sec, marginRight: 10 },
    orderLineValue: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },

    couponOptionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 13, minHeight: 56 },
    radioSelected: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: accent.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    couponCode: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    couponDesc: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    promoInputRow: { flexDirection: "row", gap: 10 },
    promoInput: {
      flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 12,
      paddingHorizontal: 14, height: moderateScale(44), fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text,
    },
    promoApplyBtn: { backgroundColor: accent.accent, borderRadius: 12, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
    promoApplyBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: accent.on },
    promoError: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.error, marginTop: 8 },

    tipSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(19), color: tokens.sec, marginTop: -6, marginBottom: 12 },
    tipRow: { flexDirection: "row", gap: 8 },
    tipPill: { flex: 1, borderWidth: 1, borderColor: tokens.borderStrong, backgroundColor: tokens.surface, borderRadius: 12, paddingVertical: 12, alignItems: "center", minHeight: 44 },
    tipPillText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    otherTipInput: {
      marginTop: 10, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 12,
      paddingHorizontal: 14, height: moderateScale(44), fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text,
    },

    billCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 16, gap: 11 },
    billRow: { flexDirection: "row", justifyContent: "space-between" },
    billLabel: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.sec },
    billValue: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    billNote: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.muted },
    billDivider: { borderTopWidth: 1, borderTopColor: tokens.borderStrong, borderStyle: "dashed", marginTop: 3, paddingTop: 1 },
    billTotalLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    billTotalValue: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.3, color: tokens.text },

    footer: {
      position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: tokens.surface,
      borderTopWidth: 1, borderTopColor: tokens.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 14,
    },
    placeOrderBtn: {
      backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52),
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    placeOrderBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    placeOrderBtnPrice: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on, opacity: 0.85 },
  });
