import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useDriverStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/v1/users/addresses`, { headers });
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch addresses error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert("Delete Address", "Are you sure you want to remove this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(`${apiUrl}/api/v1/users/addresses/${id}`, {
              method: "DELETE",
              headers,
            });
            const updated = await res.json();
            setAddresses(Array.isArray(updated) ? updated : []);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete address");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleEditAddress = (item: any) => {
    const lat = item.location?.coordinates?.[1] ?? item.coordinates?.lat ?? "";
    const lng = item.location?.coordinates?.[0] ?? item.coordinates?.lng ?? "";
    const qs = `editId=${encodeURIComponent(item._id || "")}&label=${encodeURIComponent(item.label || "")}&addressLine=${encodeURIComponent(item.addressLine || "")}&phone=${encodeURIComponent(item.phone || "")}&receiverName=${encodeURIComponent(item.receiverName || "")}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
    router.push(`/add-address?${qs}`);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 20 : 0) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/add-address")}
        >
          <View style={styles.addIcon}>
            <Feather name="plus" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.addText}>Add New Address</Text>
        </TouchableOpacity>

        {loading && addresses.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        ) : (
          <View style={styles.addressList}>
            {addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="map" size={48} color={Colors.border} />
                <Text style={styles.emptyText}>No saved addresses yet</Text>
              </View>
            ) : (
              addresses.map((addr: any) => (
                <View key={addr._id} style={styles.addressCard}>
                  <View style={styles.addressIconBox}>
                    <Feather
                      name={
                        addr.label === "Home"
                          ? "home"
                          : addr.label === "Work" || addr.label === "Office"
                          ? "briefcase"
                          : "map-pin"
                      }
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    <Text style={styles.addressLine} numberOfLines={2}>
                      {addr.addressLine}
                    </Text>
                    {addr.phone && (
                      <Text style={styles.addressPhone}>{addr.phone}</Text>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleEditAddress(addr)}
                    >
                      <Feather name="edit-2" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDeleteAddress(addr._id)}
                    >
                      <Feather name="trash-2" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
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
  headerTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  container: { padding: 20, gap: 20 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  addIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  addressList: { gap: 12 },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  addressIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  addressActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  addressInfo: { flex: 1, gap: 2 },
  addressLabel: { fontSize: 13, fontWeight: "700", color: Colors.text },
  addressLine: { fontSize: 11, color: Colors.textSecondary },
  addressPhone: { fontSize: 10, color: Colors.textMuted },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { color: Colors.textMuted, fontSize: 16, fontWeight: "500" },
});
