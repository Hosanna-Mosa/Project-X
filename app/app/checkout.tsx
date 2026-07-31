import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { useCartStore } from "@/contexts/cartStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { socketService } from "@/utils/socketService";
import { RazorpayIntegration } from "@/utils/razorpay";

export default function FoodCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const styles = React.useMemo(() => createStyles(), []);
  const { getItemCount, vendorId, items, clearCart } = useCartStore();
  const { user, token } = useAuthStore();
  const { setOrderId, setStatus, setServiceType } = useDeliveryStore();
  
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<any>(null);
  
  const [paymentMethod, setPaymentMethod] = React.useState<"razorpay" | "visa">("razorpay");
  const [showPromoInput, setShowPromoInput] = React.useState(false);
  const [promoCodeText, setPromoCodeText] = React.useState("");
  const [appliedPromo, setAppliedPromo] = React.useState<any>(null);
  const [isApplyingPromo, setIsApplyingPromo] = React.useState(false);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [vendorName, setVendorName] = React.useState<string>("Restaurant");
  
  // Tip options
  const tipOptions = [0, 50, 100, 150];
  const [tipAmount, setTipAmount] = React.useState<number>(100);
  const [isOtherTip, setIsOtherTip] = React.useState(false);
  const [otherTipText, setOtherTipText] = React.useState("");
  const [cartSummaryExpanded, setCartSummaryExpanded] = React.useState(true);

  const userId = React.useMemo(() => String(user?.id || user?._id || ""), [user?.id, user?._id]);

  React.useEffect(() => {
    if (vendorId) {
      customFetch<any>(`/api/v1/vendors/${vendorId}`)
        .then(v => { if (v && v.name) setVendorName(v.name); })
        .catch(() => {});
    }
  }, [vendorId]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0) || Number(params.subtotal || 0);
  const deliveryFee = Number(params.deliveryFee || 39.00);
  const taxes = Number(params.taxes || 85.00);
  const serviceFee = 49.00; 
  
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * appliedPromo.discountValue) / 100;
      if (appliedPromo.maxDiscount && discountAmount > appliedPromo.maxDiscount) {
        discountAmount = appliedPromo.maxDiscount;
      }
    } else if (appliedPromo.discountType === "FLAT") {
      discountAmount = appliedPromo.discountValue;
    }
  }

  const activeTip = isOtherTip ? (Number(otherTipText) || 0) : tipAmount;
  const total = subtotal + deliveryFee + taxes + serviceFee + activeTip - discountAmount;
  const originalTotal = subtotal + 199.00 + taxes + serviceFee + activeTip; // Mock original total with 199 delivery fee and no discount

  const handleApplyPromo = async () => {
    if (!promoCodeText.trim()) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      const response = await customFetch<any>("/api/v1/orders/validate-coupon", {
        method: "POST",
        body: JSON.stringify({ code: promoCodeText.trim(), cartTotal: subtotal }),
      });
      if (response.code) {
        setAppliedPromo(response);
        setShowPromoInput(false);
      }
    } catch (error: any) {
      const msg = error.message || "Invalid promo code";
      setPromoError(msg.replace(/^HTTP \d+.*?: /, "").trim());
    } finally {
      setIsApplyingPromo(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          const activeStr = await AsyncStorage.getItem("active_address");
          if (activeStr) {
            setSelectedAddress(JSON.parse(activeStr));
          }
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
      Alert.alert("Address required", "Please select a delivery address with a contact number from the saved addresses.");
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
      }));

      const orderDataPayload = {
        serviceType: "delivery",
        vendorId,
        totals: { subtotal, taxes, deliveryFee, serviceFee, tip: activeTip, discount: discountAmount, total },
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

      if (paymentMethod === "razorpay") {
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
      } else {
        const order = await customFetch<{ _id?: string; id?: string }>("/api/v1/orders", {
          method: "POST",
          body: JSON.stringify(orderDataPayload),
        });
        finalOrderId = order._id || order.id || "";
      }

      setOrderId(finalOrderId);
      setServiceType("delivery");
      setStatus("pending");
      clearCart();

      router.replace({
        pathname: "/finding-driver",
        params: { orderId: finalOrderId },
      });
    } catch (error: any) {
      console.error("Place order failed", error);
      Alert.alert("Order failed", error.message || "Unable to place your order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={moderateScale(24)} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerSubtitle}>Checkout</Text>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{vendorName}</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Address Card */}
        <TouchableOpacity style={styles.addressCard} onPress={() => router.push("/delivery/saved-addresses")} activeOpacity={0.8}>
          <View style={styles.addressIconWrapper}>
            <Ionicons name="home" size={moderateScale(20)} color="#fff" />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>{selectedAddress ? selectedAddress.label || "Work" : "Work"}</Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {selectedAddress ? selectedAddress.addressLine : "Rajamahendravaram, Andhra Pradesh, India [Apt: 2RWR+P33]"}
            </Text>
          </View>
          <Feather name="edit-2" size={moderateScale(18)} color="#000" />
        </TouchableOpacity>

        {/* Cart Summary Section */}
        <View style={styles.divider} />
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeaderRow}
            onPress={() => setCartSummaryExpanded(!cartSummaryExpanded)}
            activeOpacity={0.7}
          >
            <Feather name="shopping-cart" size={moderateScale(20)} color="#000" />
            <Text style={styles.sectionTitle}>Cart Summary</Text>
            <View style={{ flex: 1 }} />
            <Feather name={cartSummaryExpanded ? "chevron-up" : "chevron-down"} size={moderateScale(20)} color="#000" />
          </TouchableOpacity>
          <Text style={styles.cartSub}>{vendorName} • {getItemCount()} items</Text>
          
          {cartSummaryExpanded && (
            <View style={styles.itemsList}>
              {items.map(item => (
              <View key={item._id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemQuantity}>{item.quantity} x</Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDesc}>Standard preparation</Text>
                  </View>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          )} 
        </View>

        {/* Summary Section */}
        <View style={styles.divider} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          
          {/* Deals Row */}
          {!appliedPromo ? (
            showPromoInput ? (
              <View style={styles.promoInputRow}>
                <View style={styles.promoInputWrapper}>
                  <Feather name="tag" size={18} color="#000" />
                  <TextInput
                    style={styles.promoTextInput}
                    placeholder="Enter Promo Code"
                    value={promoCodeText}
                    onChangeText={setPromoCodeText}
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity style={styles.promoApplyBtn} onPress={handleApplyPromo} disabled={isApplyingPromo}>
                  {isApplyingPromo ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.promoApplyText}>Apply</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.dealRow} onPress={() => setShowPromoInput(true)}>
                <View style={styles.dealLeft}>
                  <Feather name="tag" size={18} color="#000" />
                  <Text style={styles.dealText}>Deals</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#000" />
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.dealRow}>
              <View style={styles.dealLeft}>
                <Feather name="check-circle" size={18} color="#16A34A" />
                <Text style={[styles.dealText, { color: '#16A34A' }]}>{appliedPromo.code} Applied!</Text>
              </View>
              <TouchableOpacity onPress={() => setAppliedPromo(null)}>
                <Text style={{ color: '#E53E3E', fontWeight: 'bold' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pricing breakdown */}
          <View style={styles.priceList}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <View style={styles.labelWithIcon}>
                <Text style={styles.priceLabel}>Estimated Tax</Text>
                <Feather name="info" size={12} color="#888" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.priceValue}>₹{taxes.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <View style={styles.labelWithIcon}>
                <Text style={styles.priceLabel}>Delivery fee</Text>
                <Feather name="info" size={12} color="#888" style={{ marginLeft: 4 }} />
              </View>
              <View style={styles.deliveryFeeValues}>
                <Text style={styles.struckPrice}>₹199.00</Text>
                <Text style={styles.priceValue}>₹{deliveryFee.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <View style={styles.labelWithIcon}>
                <Text style={styles.priceLabel}>Service Fee</Text>
                <Feather name="info" size={12} color="#888" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.priceValue}>₹{serviceFee.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Dasher Tip Section */}
        <View style={styles.divider} />
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <View style={styles.labelWithIcon}>
              <Text style={styles.sectionTitle}>Dasher Tip</Text>
              <Feather name="info" size={12} color="#888" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.sectionTitle}>₹{activeTip.toFixed(2)}</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipOptionsList}>
            {tipOptions.map(opt => {
              const isSelected = !isOtherTip && tipAmount === opt;
              return (
                <TouchableOpacity 
                  key={opt} 
                  style={[styles.tipPill, isSelected && styles.tipPillSelected]}
                  onPress={() => { setIsOtherTip(false); setTipAmount(opt); }}
                >
                  <Text style={[styles.tipPillText, isSelected && styles.tipPillTextSelected]}>
                    {opt === 0 ? "None" : `₹${opt.toFixed(2)}`}
                  </Text>
                </TouchableOpacity>
              )
            })}
            <TouchableOpacity 
              style={[styles.tipPill, isOtherTip && styles.tipPillSelected]}
              onPress={() => setIsOtherTip(true)}
            >
              <Text style={[styles.tipPillText, isOtherTip && styles.tipPillTextSelected]}>Other</Text>
            </TouchableOpacity>
          </ScrollView>
          
          {isOtherTip && (
            <TextInput
              style={styles.otherTipInput}
              placeholder="Enter tip amount"
              keyboardType="numeric"
              value={otherTipText}
              onChangeText={setOtherTipText}
            />
          )}

          <Text style={styles.tipFooterText}>100% of the tip goes to your Dasher.</Text>
        </View>

        <View style={styles.divider} />
        
        {/* Total Section */}
        <View style={styles.totalSection}>
          <Text style={styles.totalTitle}>Total</Text>
          <View style={styles.totalValues}>
            {(discountAmount > 0 || deliveryFee < 199) && (
              <Text style={styles.struckTotal}>₹{originalTotal.toFixed(2)}</Text>
            )}
            <Text style={styles.finalTotal}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: 12 }]}>
        {discountAmount > 0 && (
          <View style={styles.savingsRow}>
            <Feather name="tag" size={16} color="#000" />
            <Text style={styles.savingsText}>Saving ₹{discountAmount.toFixed(2)} with Deals</Text>
          </View>
        )}
        <TouchableOpacity style={styles.placeOrderBtn} onPress={placeOrder} disabled={isPlacingOrder}>
          {isPlacingOrder ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderBtnText}>Place order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  headerTitles: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: moderateScale(10),
    color: "#666",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    color: "#000",
  },
  content: {
    paddingHorizontal: 0,
  },
  addressCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: moderateScale(16),
    padding: 16,
  },
  addressIconWrapper: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: moderateScale(15),
    fontWeight: "bold",
    color: "#000",
    marginBottom: 2,
  },
  addressText: {
    fontSize: moderateScale(13),
    color: "#888",
  },
  divider: {
    height: 6,
    backgroundColor: "#F5F5F5",
    width: "100%",
  },
  section: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#000",
    marginLeft: 8,
  },
  cartSub: {
    fontSize: moderateScale(13),
    color: "#888",
    marginTop: 4,
    marginBottom: 16,
  },
  itemsList: {
    gap: 16,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemLeft: {
    flexDirection: "row",
    flex: 1,
    paddingRight: 16,
  },
  itemQuantity: {
    fontSize: moderateScale(14),
    fontWeight: "bold",
    color: "#000",
    marginRight: 12,
    marginTop: 2,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: moderateScale(15),
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: moderateScale(13),
    color: "#888",
  },
  itemPrice: {
    fontSize: moderateScale(15),
    fontWeight: "bold",
    color: "#000",
  },
  dealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 12,
  },
  dealLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dealText: {
    fontSize: moderateScale(15),
    fontWeight: "bold",
    color: "#000",
    marginLeft: 12,
  },
  promoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  promoInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: moderateScale(8),
    paddingHorizontal: 12,
    height: moderateScale(48),
  },
  promoTextInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: moderateScale(15),
    color: "#000",
  },
  promoApplyBtn: {
    backgroundColor: "#000",
    borderRadius: moderateScale(8),
    height: moderateScale(48),
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  promoApplyText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: moderateScale(15),
  },
  priceList: {
    gap: 12,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: moderateScale(14),
    color: "#444",
    fontWeight: "600",
  },
  priceValue: {
    fontSize: moderateScale(14),
    color: "#000",
    fontWeight: "bold",
  },
  deliveryFeeValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  struckPrice: {
    fontSize: moderateScale(14),
    color: "#999",
    textDecorationLine: "line-through",
  },
  tipOptionsList: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  tipPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: moderateScale(20),
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  tipPillSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  tipPillText: {
    fontSize: moderateScale(14),
    fontWeight: "bold",
    color: "#000",
  },
  tipPillTextSelected: {
    color: "#fff",
  },
  otherTipInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: moderateScale(8),
    padding: 12,
    fontSize: moderateScale(15),
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 8,
  },
  tipFooterText: {
    fontSize: moderateScale(12),
    color: "#888",
    marginTop: 8,
  },
  totalSection: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalTitle: {
    fontSize: moderateScale(22),
    fontWeight: "900",
    color: "#000",
  },
  totalValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  struckTotal: {
    fontSize: moderateScale(18),
    color: "#999",
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  finalTotal: {
    fontSize: moderateScale(24),
    fontWeight: "900",
    color: "#000",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: "flex-start",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  savingsText: {
    fontSize: moderateScale(14),
    fontWeight: "bold",
    color: "#000",
  },
  placeOrderBtn: {
    backgroundColor: "#000",
    width: "100%",
    height: moderateScale(54),
    borderRadius: moderateScale(12),
    justifyContent: "center",
    alignItems: "center",
  },
  placeOrderBtnText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "bold",
  },
});
