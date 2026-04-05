import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any[]>("/api/users/addresses");
      setAddresses(data || []);
      if (user) setUser({ ...user, addresses: data || [] });
    } catch (err) {
      console.error("Fetch addresses error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to remove this address?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoading(true);
              const updatedAddresses = await customFetch<any[]>(`/api/users/addresses/${id}`, { method: "DELETE" });
              setAddresses(updatedAddresses || []);
              if (user) setUser({ ...user, addresses: updatedAddresses || [] });
            } catch (err: any) {
              console.error("Delete error:", err);
              Alert.alert("Error", err.message || "Failed to delete address");
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 0) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => router.push("/delivery/add-address")}
        >
          <View style={styles.addIcon}>
            <Feather name="plus" size={20} color={Colors.light.primary} />
          </View>
          <Text style={styles.addText}>Add New Address</Text>
        </TouchableOpacity>

        {loading && addresses.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.light.primary} />
        ) : (
          <View style={styles.addressList}>
            {addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="map" size={48} color="#E2E8F0" />
                <Text style={styles.emptyText}>No saved addresses yet</Text>
              </View>
            ) : (
              addresses.map((addr) => (
                <View key={addr._id} style={styles.addressCard}>
                  <View style={styles.addressIconBox}>
                    <Feather 
                      name={addr.label === "Home" ? "home" : addr.label === "Office" ? "briefcase" : "map-pin"} 
                      size={20} 
                      color="#64748B" 
                    />
                  </View>
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    <Text style={styles.addressLine} numberOfLines={2}>{addr.addressLine}</Text>
                    {addr.phone && <Text style={styles.addressPhone}>{addr.phone}</Text>}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity style={styles.actionBtn}>
                      <Feather name="edit-2" size={18} color={Colors.light.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteAddress(addr._id)}>
                      <Feather name="trash-2" size={18} color="#EF4444" />
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
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: Colors.light.text },
  container: { padding: 20, gap: 20 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontSize: 16, fontWeight: "700", color: Colors.light.primary },
  addressList: { gap: 12 },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
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
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  addressActions: { flexDirection: "row", gap: 8 },
  actionBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: "#F8FAFC", 
    alignItems: "center", 
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { color: Colors.light.textMuted, fontSize: 16, fontWeight: "500" },
});
