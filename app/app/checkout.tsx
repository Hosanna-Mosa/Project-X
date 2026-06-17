import React from "react";
import {
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
import { useCartStore } from "@/contexts/cartStore";
import { useThemeStore } from "@/contexts/themeStore";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { ScheduleDateTimeSheet } from "@/components/ScheduleDateTimeSheet";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { socketService } from "@/utils/socketService";

export default function FoodCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getItemCount, vendorId } = useCartStore();
  const { user } = useAuthStore();
  const [isAddressSheetOpen, setIsAddressSheetOpen] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<any>(null);
  const [deliveryTiming, setDeliveryTiming] = React.useState<"now" | "later" | null>(null);
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

  const total = Number(params.total || 0);
  const subtotal = Number(params.subtotal || 0);
  const taxes = Number(params.taxes || 0);
  const deliveryFee = Number(params.deliveryFee || 0);

  const hasValidAddress = Boolean(selectedAddress?.addressLine && selectedAddress?.phone);

  const isLaterConfirmed = deliveryTiming === "later" && scheduleStatus === "accepted";
  const isNowReady = deliveryTiming === "now" && hasValidAddress;

  // Later: enable immediately once restaurant confirms the slot.
  // Now: enable once a valid address is selected.
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

  const continueToPayment = () => {
    if (getItemCount() === 0) {
      Alert.alert("Cart is empty", "Please add at least one item.");
      return;
    }
    if (!selectedAddress || !selectedAddress.addressLine || !selectedAddress.phone) {
      Alert.alert("Address required", "Please select a delivery address with a contact number from the saved addresses.");
      return;
    }
    if (!deliveryTiming) {
      Alert.alert("Delivery time required", "Please choose now or later.");
      return;
    }
    if (deliveryTiming === "later" && scheduleStatus !== "accepted") {
      Alert.alert("Waiting for restaurant", "Payment is enabled only after the restaurant accepts your requested delivery time.");
      return;
    }
    const deliveryAddress = {
      label: selectedAddress.label || "",
      addressLine: selectedAddress.addressLine,
      phone: selectedAddress.phone || "",
      receiverName: selectedAddress.receiverName || "",
      formattedAddress: selectedAddress.addressLine,
    };

    router.push({
      pathname: "/payment",
      params: {
        address: deliveryAddress.formattedAddress,
        deliveryAddress: JSON.stringify(deliveryAddress),
        lat: String(selectedAddress.coordinates?.lat ?? selectedAddress.location?.coordinates?.[1] ?? 17.0005),
        lng: String(selectedAddress.coordinates?.lng ?? selectedAddress.location?.coordinates?.[0] ?? 81.804),
        subtotal: String(subtotal),
        taxes: String(taxes),
        deliveryFee: String(deliveryFee),
        total: String(total),
        deliveryTiming,
        scheduledFor: deliveryTiming === "later" ? scheduledFor || "" : "",
      },
    });
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

  const goHome = () => {
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 42 : 14) }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130 }]}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="map-pin" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>

          <TouchableOpacity
            style={[styles.addressSelector, selectedAddress && styles.addressSelectorActive]}
            onPress={() => setIsAddressSheetOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.addressSelectorIcon}>
              <Feather
                name={selectedAddress ? "check-circle" : "chevron-down"}
                size={18}
                color={selectedAddress ? "#16A34A" : colors.primary}
              />
            </View>
            <View style={styles.addressSelectorContent}>
              <Text style={styles.addressSelectorLabel}>
                {selectedAddress ? selectedAddress.label || "Selected Address" : "Select a saved address"}
              </Text>
              <Text style={styles.addressSelectorText} numberOfLines={1}>
                {selectedAddress
                  ? selectedAddress.addressLine
                  : "Tap to choose from your saved addresses or search for a location"}
              </Text>
            </View>
            <Feather name="edit-2" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.row}><Text style={styles.label}>Items</Text><Text style={styles.value}>Rs.{subtotal}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Delivery</Text><Text style={styles.value}>{deliveryFee === 0 ? "Free" : `Rs.${deliveryFee}`}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Taxes</Text><Text style={styles.value}>Rs.{taxes}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Payable</Text><Text style={styles.totalValue}>Rs.{total}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Time</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segmentButton, deliveryTiming === "now" && styles.segmentButtonActive]}
              onPress={handleSelectNow}
              activeOpacity={0.85}
            >
              <Feather name="zap" size={14} color={deliveryTiming === "now" ? "#fff" : colors.text} />
              <Text style={[styles.segmentText, deliveryTiming === "now" && styles.segmentTextActive]}>Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, deliveryTiming === "later" && styles.segmentButtonActive]}
              onPress={handleSelectLater}
              activeOpacity={0.85}
            >
              <Feather name="calendar" size={14} color={deliveryTiming === "later" ? "#fff" : colors.text} />
              <Text style={[styles.segmentText, deliveryTiming === "later" && styles.segmentTextActive]}>Later</Text>
            </TouchableOpacity>
          </View>

          {deliveryTiming === "now" && (
            <View style={styles.timingReadyBadge}>
              <Feather name="check-circle" size={14} color="#16A34A" />
              <Text style={styles.timingReadyText}>Ready for immediate delivery</Text>
            </View>
          )}

          {deliveryTiming === "later" && (
            <TouchableOpacity style={styles.laterSummaryCard} onPress={() => setShowScheduleModal(true)} activeOpacity={0.85}>
              <View style={styles.laterSummaryIcon}>
                <Feather name="clock" size={16} color={colors.primary} />
              </View>
              <View style={styles.laterSummaryText}>
                <Text style={styles.laterSummaryTitle}>
                  {scheduleStatus === "accepted"
                    ? "Scheduled delivery confirmed"
                    : scheduleStatus === "pending"
                      ? "Waiting for restaurant"
                      : scheduleStatus === "rejected"
                        ? "Time rejected — pick another"
                        : "Choose delivery date & time"}
                </Text>
                <Text style={styles.laterSummarySub} numberOfLines={2}>
                  {scheduleStatus === "accepted" && scheduledFor
                    ? new Date(scheduledFor).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                    : scheduleStatus === "pending"
                      ? "Restaurant is reviewing your requested slot"
                      : "Tap to open schedule picker"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {deliveryTiming === "now" && !hasValidAddress && (
          <Text style={styles.footerHint}>Select an address to continue</Text>
        )}
        {isLaterConfirmed && !hasValidAddress && (
          <Text style={styles.footerHint}>Delivery time confirmed — select an address before payment</Text>
        )}
        {deliveryTiming === "later" && scheduleStatus === "pending" && (
          <Text style={styles.footerHint}>Waiting for restaurant to confirm your delivery time</Text>
        )}
        {scheduleStatus === "rejected" && (
          <TouchableOpacity style={styles.homeButton} onPress={goHome} activeOpacity={0.85}>
            <Feather name="home" size={18} color={colors.text} />
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.payButton, !canContinue && styles.disabledButton]}
          onPress={continueToPayment}
          disabled={!canContinue}
        >
          <Text style={styles.payButtonText}>Continue to Payment</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  addressSelectorActive: {
    borderColor: "#16A34A",
    backgroundColor: "rgba(22, 163, 74, 0.06)",
  },
  addressSelectorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  addressSelectorContent: { flex: 1, gap: 2 },
  addressSelectorLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  addressSelectorText: { fontSize: 11, color: colors.textSecondary },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, color: colors.textSecondary },
  value: { fontSize: 13, fontWeight: "700", color: colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "900", color: colors.text },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  footerHint: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 13,
  },
  homeButtonText: { fontSize: 15, fontWeight: "800", color: colors.text },
  payButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  disabledButton: { opacity: 0.45 },
  payButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  segmentRow: { flexDirection: "row", gap: 10 },
  segmentButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    flexDirection: "row",
    gap: 6,
  },
  segmentButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: "800", color: colors.text },
  segmentTextActive: { color: "#fff" },
  timingReadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.2)",
  },
  timingReadyText: { fontSize: 12, fontWeight: "700", color: "#15803D" },
  laterSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  laterSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  laterSummaryText: { flex: 1, gap: 2 },
  laterSummaryTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  laterSummarySub: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
});
