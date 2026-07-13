import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

const LABEL_OPTIONS = ["Home", "Work", "Other"];

export default function AddAddressScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { token } = useDriverStore();

  const isEditMode = !!(params.editId && String(params.editId).length > 0);

  const [label, setLabel] = useState(String(params.label || "Home"));
  const [addressLine, setAddressLine] = useState(String(params.addressLine || ""));
  const [phone, setPhone] = useState(String(params.phone || ""));
  const [receiverName, setReceiverName] = useState(String(params.receiverName || ""));
  const [loading, setLoading] = useState(false);
  const [addressLat, setAddressLat] = useState<number | null>(params.lat ? Number(params.lat) : null);
  const [addressLng, setAddressLng] = useState<number | null>(params.lng ? Number(params.lng) : null);
  const [fetchingLoc, setFetchingLoc] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/api/v1/places/autocomplete?input=${encodeURIComponent(query)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Failed to fetch autocomplete suggestions:", err);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setFetchingLoc(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permissions are required to fetch your current location.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const { latitude, longitude } = loc.coords;
      setAddressLat(latitude);
      setAddressLng(longitude);

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (geocode) {
        const parts = [
          geocode.name,
          geocode.street,
          geocode.district,
          geocode.city,
          geocode.subregion,
          geocode.region,
          geocode.postalCode,
          geocode.country
        ].filter(Boolean);

        setAddressLine(parts.join(", "));
      } else {
        setAddressLine(`Coords: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to fetch current location.");
    } finally {
      setFetchingLoc(false);
    }
  };

  const handleSave = async () => {
    if (!addressLine.trim()) {
      Alert.alert("Missing information", "Please enter your address.");
      return;
    }

    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: any = {
        label,
        addressLine: addressLine.trim(),
      };
      if (phone.trim()) body.phone = phone.trim();
      if (receiverName.trim()) body.receiverName = receiverName.trim();
      if (isEditMode && params.editId) {
        body.editId = String(params.editId);
      }
      if (addressLat !== null && addressLng !== null) {
        body.coordinates = { lat: addressLat, lng: addressLng };
      } else if (params.lat && params.lng) {
        body.coordinates = { lat: Number(params.lat), lng: Number(params.lng) };
      }

      const res = await fetch(`${apiUrl}/api/v1/users/addresses`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save address");
      }

      Alert.alert("Success", isEditMode ? "Address updated successfully!" : "Address saved successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 20 : 0) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? "Edit Address" : "Add New Address"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Address Label */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Save as</Text>
          <View style={styles.labelRow}>
            {LABEL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.labelChip, label === opt && styles.labelChipActive]}
                onPress={() => setLabel(opt)}
              >
                <Feather
                  name={opt === "Home" ? "home" : opt === "Work" ? "briefcase" : "map-pin"}
                  size={14}
                  color={label === opt ? Colors.white : Colors.textSecondary}
                />
                <Text style={[styles.labelChipText, label === opt && styles.labelChipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Address Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Details</Text>

          <View style={styles.inputGroup}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={styles.inputLabel}>Full Address *</Text>
              <TouchableOpacity
                onPress={handleGetCurrentLocation}
                disabled={fetchingLoc}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {fetchingLoc ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Feather name="target" size={16} color={Colors.primary} />
                )}
                <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.primary }}>
                  {fetchingLoc ? "Locating..." : "Use Current Location"}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. 12, MG Road, Koramangala, Bangalore"
              placeholderTextColor={Colors.textMuted}
              value={addressLine}
              onChangeText={(text) => {
                setAddressLine(text);
                fetchSuggestions(text);
              }}
              multiline
            />

            {suggestions.length > 0 && (
              <View style={{
                borderWidth: 1,
                borderColor: Colors.border || "#e2e8f0",
                borderRadius: 12,
                backgroundColor: "#ffffff",
                maxHeight: 180,
                overflow: "hidden",
                marginTop: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                zIndex: 999
              }}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }}>
                  {suggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setAddressLine(item.address);
                        setAddressLat(item.lat);
                        setAddressLng(item.lng);
                        setSuggestions([]);
                      }}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#f1f5f9"
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#1e293b", fontWeight: "600" }}>{item.name}</Text>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>{item.address}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {addressLat !== null && addressLng !== null && (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#f0fdf4",
                borderWidth: 1.5,
                borderColor: Colors.success || "#22c55e",
                borderRadius: 12,
                padding: 12,
                gap: 10,
                marginTop: 8
              }}>
                <Feather name="check-circle" size={18} color="#22c55e" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#166534" }}>
                    Location Coordinates Resolved
                  </Text>
                  <Text style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>
                    Coords: [{addressLng.toFixed(4)}, {addressLat.toFixed(4)}]
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Contact Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Receiver's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter receiver name"
              placeholderTextColor={Colors.textMuted}
              value={receiverName}
              onChangeText={setReceiverName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Save Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEditMode ? "Update Address" : "Save Address"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  labelRow: {
    flexDirection: "row",
    gap: 10,
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    justifyContent: "center",
  },
  labelChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  labelChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  labelChipTextActive: {
    color: Colors.white,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
    minHeight: 48,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
});
