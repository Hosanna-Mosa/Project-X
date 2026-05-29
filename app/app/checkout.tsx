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

export default function FoodCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getItemCount } = useCartStore();
  const [isAddressSheetOpen, setIsAddressSheetOpen] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<any>(null);

  const handleSelectAddress = React.useCallback((address: any) => {
    setSelectedAddress(address);
  }, []);

  const total = Number(params.total || 0);
  const subtotal = Number(params.subtotal || 0);
  const taxes = Number(params.taxes || 0);
  const deliveryFee = Number(params.deliveryFee || 0);

  const continueToPayment = () => {
    if (getItemCount() === 0) {
      Alert.alert("Cart is empty", "Please add at least one item.");
      return;
    }
    if (!selectedAddress || !selectedAddress.addressLine || !selectedAddress.phone) {
      Alert.alert("Address required", "Please select a delivery address with a contact number from the saved addresses.");
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
      },
    });
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

          {/* Address Selector */}
          <TouchableOpacity 
            style={[styles.addressSelector, selectedAddress && { borderColor: '#16A34A' }]}
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.payButton} onPress={continueToPayment}>
          <Text style={styles.payButtonText}>Continue to Payment</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <LocationPickerSheet 
        isOpen={isAddressSheetOpen} 
        onClose={() => setIsAddressSheetOpen(false)} 
        onSelectAddress={handleSelectAddress}
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
  card: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  addressSelectorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  addressSelectorContent: {
    flex: 1,
    gap: 2,
  },
  addressSelectorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  addressSelectorText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, color: colors.textSecondary },
  value: { fontSize: 13, fontWeight: "700", color: colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "900", color: colors.text },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  payButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  payButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
