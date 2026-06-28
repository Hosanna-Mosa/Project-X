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
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useCartStore } from "@/contexts/cartStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { ScheduleDateTimeSheet } from "@/components/ScheduleDateTimeSheet";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { socketService } from "@/utils/socketService";

export default function FoodCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getItemCount, vendorId, items, clearCart } = useCartStore();
  const { user, token } = useAuthStore();
  const { setOrderId, setStatus, setServiceType } = useDeliveryStore();
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<any>(null);
  const [deliveryTiming, setDeliveryTiming] = React.useState<"now" | "later" | null>("now"); // Default standard (now)
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [scheduleStatus, setScheduleStatus] = React.useState<"idle" | "pending" | "accepted" | "rejected">("idle");
  const [scheduledFor, setScheduledFor] = React.useState<string | null>(null);
  const [scheduleRequestId, setScheduleRequestId] = React.useState<string | null>(null);
  const [isSendingSchedule, setIsSendingSchedule] = React.useState(false);

  const userId = React.useMemo(
    () => String(user?.id || user?._id || ""),
    [user?.id, user?._id],
  );

  const handleSelectAddress = React.useCallback((address: any) => {
    setSelectedAddress(address);
  }, []);

  // Mocking values if they equal standard menu sum, else use params
  const subtotal = Number(params.subtotal || 24.00);
  const deliveryFee = Number(params.deliveryFee || 0.99);
  const taxes = Number(params.taxes || 1.46);
  const total = Number(params.total || 26.45);

  const hasValidAddress = React.useMemo(() => {
    return Boolean(selectedAddress?.addressLine && selectedAddress?.phone);
  }, [selectedAddress]);

  const isLaterConfirmed = deliveryTiming === "later" && scheduleStatus === "accepted";
  const isNowReady = deliveryTiming === "now" && hasValidAddress;
  const canContinue = isLaterConfirmed || isNowReady;

  React.useEffect(() => {
    if (!userId) return;
    socketService.connect();
    socketService.emit("join", { userId, role: "USER" });

    const matchesCustomer = (data: any) => String(data?.customerId) === userId;

    const handleAccepted = (data: any) => {
      if (!matchesCustomer(data)) return;
      setDeliveryTiming("later");
      setScheduleStatus("accepted");
      if (data.scheduledFor) {
        setScheduledFor(
          typeof data.scheduledFor === "string"
            ? data.scheduledFor
            : new Date(data.scheduledFor).toISOString(),
        );
      }
    };
    const handleRejected = (data: any) => {
      if (!matchesCustomer(data)) return;
      setScheduleStatus("rejected");
    };

    socketService.on("scheduled_delivery_accepted", handleAccepted);
    socketService.on("scheduled_delivery_rejected", handleRejected);
    return () => {
      socketService.off("scheduled_delivery_accepted", handleAccepted);
      socketService.off("scheduled_delivery_rejected", handleRejected);
    };
  }, [userId]);

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

  React.useEffect(() => {
    if (scheduleStatus !== "pending" || !scheduleRequestId) return;

    const pollStatus = async () => {
      try {
        const status = await customFetch<any>(`/api/v1/orders/scheduled-delivery/${scheduleRequestId}/status`);
        if (status.status === "accepted") {
          setDeliveryTiming("later");
          setScheduleStatus("accepted");
          if (status.scheduledFor) {
            setScheduledFor(
              typeof status.scheduledFor === "string"
                ? status.scheduledFor
                : new Date(status.scheduledFor).toISOString(),
            );
          }
        } else if (status.status === "rejected") {
          setScheduleStatus("rejected");
        }
      } catch {
        // Ignore transient polling errors
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2500);
    return () => clearInterval(interval);
  }, [scheduleStatus, scheduleRequestId]);

  const placeOrder = async () => {
    if (getItemCount() === 0) {
      Alert.alert("Cart is empty", "Please add at least one item.");
      return;
    }
    if (!user || !token) {
      Alert.alert("Login required", "Please log in before placing your order.");
      router.push("/");
      return;
    }
    if (!selectedAddress || !selectedAddress.addressLine || !selectedAddress.phone) {
      Alert.alert("Address required", "Please select a delivery address with a contact number from the saved addresses.");
      return;
    }
    if (!deliveryTiming) {
      Alert.alert("Delivery time required", "Please choose standard or schedule for later.");
      return;
    }
    if (deliveryTiming === "later" && scheduleStatus !== "accepted") {
      Alert.alert("Waiting for restaurant", "You can place the order only after the restaurant accepts your requested delivery time.");
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
      let vendor: { name?: string; address?: string; location?: { coordinates?: number[] } } | null = null;
      try {
        vendor = await customFetch<any>(`/api/v1/vendors/${vendorId}`);
      } catch {
        // Fall back to default pickup coordinates if vendor details are unavailable
      }

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

      const order = await customFetch<{ _id?: string; id?: string }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          serviceType: "delivery",
          vendorId,
          totals: { subtotal, taxes, deliveryFee, total },
          scheduledDelivery: {
            type: deliveryTiming === "later" ? "later" : "now",
            requestedAt: deliveryTiming === "later" && scheduledFor ? scheduledFor : undefined,
          },
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
              address: deliveryAddressObj.formattedAddress,
              deliveryAddress: deliveryAddressObj,
              latitude: dropLat,
              longitude: dropLng,
              type: "drop",
              items: orderItems,
            },
          ],
        }),
      });

      const finalOrderId = order._id || order.id;
      if (!finalOrderId) {
        throw new Error("Order was created but no order ID was returned.");
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
      Alert.alert("Order failed", error.message || "Unable to place your order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const requestScheduleApproval = async (requested: Date) => {
    if (!vendorId) {
      Alert.alert("Restaurant missing", "Please choose a restaurant again.");
      return;
    }
    if (requested.getTime() <= Date.now()) {
      Alert.alert("Invalid time", "Please choose a future delivery time.");
      return;
    }

    setIsSendingSchedule(true);
    setDeliveryTiming("later");
    setScheduleStatus("pending");
    setScheduledFor(requested.toISOString());
    setShowScheduleModal(false);

    try {
      const response = await customFetch<any>("/api/v1/orders/scheduled-delivery-request", {
        method: "POST",
        body: JSON.stringify({ vendorId, scheduledFor: requested.toISOString() }),
      });
      if (response?.requestId) setScheduleRequestId(response.requestId);
    } catch (error: any) {
      setScheduleStatus("idle");
      setScheduledFor(null);
      setScheduleRequestId(null);
      Alert.alert("Request failed", error.message || "Could not send the schedule request.");
    } finally {
      setIsSendingSchedule(false);
    }
  };

  const handleSelectNow = () => {
    setDeliveryTiming("now");
    setScheduleStatus("idle");
    setScheduledFor(null);
    setScheduleRequestId(null);
    setShowScheduleModal(false);
  };

  const handleSelectLater = () => {
    setDeliveryTiming("later");
    setScheduleStatus("idle");
    setScheduledFor(null);
    setScheduleRequestId(null);
    setShowScheduleModal(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Header Layout */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#002045" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 150 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Delivery Address</Text>
          
          <TouchableOpacity
            style={styles.addressCard}
            onPress={() => router.push("/delivery/saved-addresses")}
            activeOpacity={0.8}
          >
            <View style={styles.addressIconContainer}>
              <Ionicons name="home" size={18} color="#ffffff" />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>
                {selectedAddress ? selectedAddress.label || "Home" : "Home"}
              </Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress
                  ? selectedAddress.addressLine
                  : "123 Serene Street, Apt 4B, New York, NY"}
              </Text>
            </View>
            <Feather name="edit-2" size={16} color="#002045" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {/* Delivery Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Delivery Time</Text>
          
          {/* Standard Delivery Option */}
          <TouchableOpacity
            style={[
              styles.timeCard,
              deliveryTiming === "now" && styles.timeCardActive,
            ]}
            onPress={handleSelectNow}
            activeOpacity={0.8}
          >
            <View style={[styles.timeIconCircle, deliveryTiming === "now" && styles.timeIconCircleActive]}>
              <Ionicons 
                name="flash" 
                size={18} 
                color={deliveryTiming === "now" ? "#0061a5" : "#74777f"} 
              />
            </View>
            <View style={styles.timeDetails}>
              <Text style={styles.timeTitle}>Standard</Text>
              <Text style={styles.timeSub}>25-35 min</Text>
            </View>
            {deliveryTiming === "now" ? (
              <Ionicons name="checkmark-circle" size={22} color="#0061a5" />
            ) : (
              <View style={styles.circlePlaceholder} />
            )}
          </TouchableOpacity>

          {/* Schedule For Later Option */}
          <TouchableOpacity
            style={[
              styles.timeCard,
              deliveryTiming === "later" && styles.timeCardActive,
            ]}
            onPress={handleSelectLater}
            activeOpacity={0.8}
          >
            <View style={styles.timeIconCircle}>
              <Ionicons 
                name="time" 
                size={18} 
                color={deliveryTiming === "later" ? "#0061a5" : "#74777f"} 
              />
            </View>
            <View style={styles.timeDetails}>
              <Text style={styles.timeTitle}>Schedule for later</Text>
              <Text style={styles.timeSub}>
                {deliveryTiming === "later" && scheduledFor
                  ? new Date(scheduledFor).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : "Pick a time"}
              </Text>
            </View>
            {deliveryTiming === "later" && scheduleStatus === "accepted" ? (
              <Ionicons name="checkmark-circle" size={22} color="#0061a5" />
            ) : (
              <Feather name="chevron-right" size={18} color="#74777f" />
            )}
          </TouchableOpacity>

          {/* Scheduler status label */}
          {deliveryTiming === "later" && (
            <View style={styles.schedulerStatusRow}>
              {scheduleStatus === "pending" && (
                <Text style={styles.schedulerPending}>Waiting for restaurant confirmation...</Text>
              )}
              {scheduleStatus === "rejected" && (
                <Text style={styles.schedulerRejected}>Time slot rejected. Tap to pick another.</Text>
              )}
              {scheduleStatus === "accepted" && (
                <Text style={styles.schedulerAccepted}>Scheduled delivery confirmed!</Text>
              )}
            </View>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Payment Method</Text>
          
          <View style={styles.paymentCard}>
            <View style={styles.visaBadge}>
              <Text style={styles.visaBadgeText}>VISA</Text>
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentName}>Visa ending in 4242</Text>
              <Text style={styles.paymentSub}>Expiry 12/26</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.editPaymentText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Promo Code Option */}
        <TouchableOpacity style={styles.promoCard} activeOpacity={0.8}>
          <Ionicons name="pricetag" size={18} color="#0061a5" />
          <Text style={styles.promoText}>Add Promo Code</Text>
          <Feather name="arrow-right" size={18} color="#0061a5" />
        </TouchableOpacity>

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹{deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes & Fees</Text>
            <Text style={styles.summaryValue}>₹{taxes.toFixed(2)}</Text>
          </View>

          <View style={styles.summarySeparator} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Place Order Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        {deliveryTiming === "now" && !hasValidAddress && (
          <Text style={styles.footerHint}>Select an address to continue</Text>
        )}
        {isLaterConfirmed && !hasValidAddress && (
          <Text style={styles.footerHint}>Confirm address before checking out</Text>
        )}
        {deliveryTiming === "later" && scheduleStatus === "pending" && (
          <Text style={styles.footerHint}>Waiting for restaurant to confirm schedule request</Text>
        )}
        
        <TouchableOpacity
          style={[styles.placeOrderBtn, (!canContinue || isPlacingOrder) && styles.placeOrderBtnDisabled]}
          onPress={placeOrder}
          disabled={!canContinue || isPlacingOrder}
          activeOpacity={0.9}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <Text style={styles.placeOrderValue}>₹{total.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          BY PLACING AN ORDER, YOU AGREE TO OUR TERMS OF SERVICE
        </Text>
      </View>

      <LocationPickerSheet
        isOpen={isAddressSheetOpen}
        onClose={() => setIsAddressSheetOpen(false)}
        onSelectAddress={handleSelectAddress}
      />

      <ScheduleDateTimeSheet
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule delivery"
        subtitle="Pick when you want your food delivered"
        confirmLabel="OK"
        loading={isSendingSchedule}
        initialDate={scheduledFor ? new Date(scheduledFor) : undefined}
        onConfirm={(date) => {
          if (date.getTime() <= Date.now()) {
            Alert.alert("Invalid time", "Please choose a future delivery time.");
            return;
          }
          requestScheduleApproval(date);
        }}
      />
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f7f9fb", // Cool Slate neutral canvas
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 14,
    backgroundColor: "#f7f9fb",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#002045",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#002045",
    letterSpacing: -0.2,
    marginLeft: 2,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f4f6", // desaturated card container
    borderRadius: 16,
    padding: 16,
  },
  addressIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#002045",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#002045",
  },
  addressText: {
    fontSize: 12,
    color: "#43474e",
    lineHeight: 16,
  },
  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 14,
    marginBottom: 8,
  },
  timeCardActive: {
    borderColor: "#0061a5", // Active Blue border highlight
    borderWidth: 2,
  },
  timeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eceef0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  timeIconCircleActive: {
    backgroundColor: "rgba(0, 97, 165, 0.1)",
  },
  timeDetails: {
    flex: 1,
    gap: 2,
  },
  timeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#002045",
  },
  timeSub: {
    fontSize: 12,
    color: "#74777f",
  },
  circlePlaceholder: {
    width: 22,
    height: 22,
  },
  schedulerStatusRow: {
    paddingHorizontal: 8,
    paddingTop: 2,
  },
  schedulerPending: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },
  schedulerRejected: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  schedulerAccepted: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 14,
  },
  visaBadge: {
    backgroundColor: "#eceef0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 14,
  },
  visaBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0061a5",
    letterSpacing: 0.5,
  },
  paymentDetails: {
    flex: 1,
    gap: 2,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#002045",
  },
  paymentSub: {
    fontSize: 12,
    color: "#74777f",
  },
  editPaymentText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0061a5",
  },
  promoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0, 97, 165, 0.2)",
    padding: 16,
    gap: 12,
  },
  promoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0061a5",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 16,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#002045",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#74777f",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#002045",
  },
  summarySeparator: {
    height: 1,
    backgroundColor: "#eceef0",
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#002045",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#002045",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#eceef0",
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: 10,
  },
  footerHint: {
    fontSize: 12,
    fontWeight: "600",
    color: "#74777f",
    textAlign: "center",
  },
  placeOrderBtn: {
    backgroundColor: "#002045", // Solid Dark Navy
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  placeOrderBtnDisabled: {
    opacity: 0.5,
  },
  placeOrderText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  placeOrderValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  termsText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#74777f",
    textAlign: "center",
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
