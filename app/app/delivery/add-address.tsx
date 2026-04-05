import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

export default function AddAddressScreen() {
  const router = useRouter();
  const [label, setLabel] = useState("Home");
  const [addressLine, setAddressLine] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState({
    latitude: 27.1751,
    longitude: 78.0421, // Default Agra
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Allow location access to use this feature.");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      setRegion({
        ...region,
        latitude,
        longitude,
      });

      // Reverse geocode to get address
      const response = await customFetch<any[]>(`/api/places/reverse-geocode?lat=${latitude}&lng=${longitude}`);
      if (response && response.length > 0) {
        const resolved = response[0].address || response[0].formatted_address || "Unnamed location";
        setAddressLine(resolved);
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLoading(false);
    }
  };

  const { user, setUser } = useAuthStore();

  const handleSave = async () => {
    if (!addressLine || !phone || !label) {
      Alert.alert("Missing information", "Please fill all fields.");
      return;
    }

    try {
      setLoading(true);
      const updatedAddresses = await customFetch<any[]>("/api/users/addresses", {
        method: "POST",
        body: JSON.stringify({
          label,
          addressLine,
          phone,
          coordinates: {
            lat: region.latitude,
            lng: region.longitude,
          },
        }),
      });
      
      if (user) {
        setUser({ ...user, addresses: updatedAddresses });
      }
      
      Alert.alert("Success", "Address saved successfully!");
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add new address</Text>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={(r) => setRegion(r)}
            >
              <Marker coordinate={region} />
            </MapView>
            <TouchableOpacity 
              style={styles.currentLocBtn}
              onPress={handleUseCurrentLocation}
            >
              <FontAwesome5 name="crosshairs" size={20} color="#166534" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Address Label</Text>
            <View style={styles.labelRow}>
              {["Home", "Work", "Other"].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.labelBadge,
                    label === item && styles.labelBadgeActive,
                  ]}
                  onPress={() => setLabel(item)}
                >
                  <Text
                    style={[
                      styles.labelBadgeText,
                      label === item && styles.labelBadgeTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Full Address</Text>
            <View style={styles.inputContainer}>
              <Feather name="map-pin" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="Area, Street, House No."
                value={addressLine}
                onChangeText={setAddressLine}
                multiline
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Feather name="phone" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="Receiver's Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>
              {loading ? "Saving..." : "Save Address"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  mapContainer: {
    height: 250,
    width: "100%",
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  currentLocBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  form: {
    padding: 24,
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
  },
  labelRow: {
    flexDirection: "row",
    gap: 12,
  },
  labelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  labelBadgeActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  labelBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  labelBadgeTextActive: {
    color: "#047857",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "600",
    paddingTop: 0,
  },
  footer: {
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1.5,
    borderTopColor: "#F1F5F9",
  },
  saveBtn: {
    backgroundColor: "#0F172A",
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
