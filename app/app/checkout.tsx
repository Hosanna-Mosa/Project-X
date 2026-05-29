import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { useCartStore } from "@/contexts/cartStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";

export default function FoodCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getItemCount } = useCartStore();
  const { user } = useAuthStore();
  const { currentLocation, currentCoords } = useDeliveryStore();
  const [houseAddress, setHouseAddress] = React.useState("");
  const [area, setArea] = React.useState(currentLocation || "");
  const [city, setCity] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [landmark, setLandmark] = React.useState("");
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [instructions, setInstructions] = React.useState("");

  React.useEffect(() => {
    const fetchLocation = async () => {
      if (!currentCoords) {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            useDeliveryStore.getState().setCurrentCoords(coords);

            const [address] = await Location.reverseGeocodeAsync({
              latitude: coords.lat,
              longitude: coords.lng,
            });
            if (address) {
              const formatted = [
                address.name,
                address.street,
                address.district || address.subregion,
                address.city,
                address.region,
                address.postalCode
              ].filter(Boolean).join(", ");
              useDeliveryStore.getState().setCurrentLocation(formatted);
              if (!area) {
                setArea(formatted);
              }
            }
          }
        } catch (error) {
          console.warn("Checkout Screen: Failed to fetch coordinates:", error);
        }
      }
    };
    fetchLocation();
  }, [currentCoords]);

  React.useEffect(() => {
    if (currentLocation && !area) {
      setArea(currentLocation);
    }
  }, [currentLocation]);

  const total = Number(params.total || 0);
  const subtotal = Number(params.subtotal || 0);
  const taxes = Number(params.taxes || 0);
  const deliveryFee = Number(params.deliveryFee || 0);

  const continueToPayment = () => {
    if (getItemCount() === 0) {
      Alert.alert("Cart is empty", "Please add at least one item.");
      return;
    }
    if (!houseAddress.trim() || !area.trim() || !city.trim() || !pincode.trim() || !phone.trim()) {
      Alert.alert("Complete address required", "Please enter house address, area, city, pincode and phone number.");
      return;
    }
    const deliveryAddress = {
      houseAddress: houseAddress.trim(),
      area: area.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim(),
      phone: phone.trim(),
      formattedAddress: [
        houseAddress.trim(),
        landmark.trim(),
        area.trim(),
        city.trim(),
        pincode.trim(),
      ].filter(Boolean).join(", "),
    };

    router.push({
      pathname: "/payment",
      params: {
        address: deliveryAddress.formattedAddress,
        deliveryAddress: JSON.stringify(deliveryAddress),
        instructions: instructions.trim(),
        lat: String(currentCoords?.lat ?? 17.0005),
        lng: String(currentCoords?.lng ?? 81.804),
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
          <TextInput
            value={houseAddress}
            onChangeText={setHouseAddress}
            placeholder="House / flat number and street"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.addressInput}
          />
          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder="Area / locality"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <View style={styles.inputRow}>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.inputHalf]}
            />
            <TextInput
              value={pincode}
              onChangeText={setPincode}
              placeholder="Pincode"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={[styles.input, styles.inputHalf]}
            />
          </View>
          <TextInput
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Landmark"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Delivery contact phone"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Delivery instructions"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="user" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Contact</Text>
          </View>
          <Text style={styles.detailText}>{user?.name || "Customer"}</Text>
          <Text style={styles.mutedText}>{user?.phone || "Phone number from your account"}</Text>
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
  addressInput: { minHeight: 86, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.text, textAlignVertical: "top", backgroundColor: colors.surfaceSecondary },
  input: { borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, backgroundColor: colors.surfaceSecondary },
  inputRow: { flexDirection: "row", gap: 10 },
  inputHalf: { flex: 1 },
  detailText: { fontSize: 14, fontWeight: "800", color: colors.text },
  mutedText: { fontSize: 13, color: colors.textSecondary },
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
