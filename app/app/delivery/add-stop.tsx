import React, { useState } from "react";
import {
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
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useDeliveryStore } from "@/contexts/deliveryStore";

const QUICK_ADDRESSES = [
  { name: "Artisan Bakery & Co.", address: "482 Marketplace Ave, Suite 4" },
  { name: "The Green Grocer", address: "1201 West Oak Street" },
  { name: "City Pharmacy", address: "89 Commerce Blvd" },
  { name: "Tech Corner Store", address: "33 Innovation Drive" },
];

export default function AddStopScreen() {
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState("");
  const [storeName, setStoreName] = useState("");
  const { addStop } = useDeliveryStore();

  const handleAdd = (addr?: string, store?: string) => {
    const finalAddress = addr ?? address;
    const finalStore = store ?? storeName;
    if (!finalAddress.trim()) return;
    addStop(finalAddress, finalStore || undefined);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Pickup Location</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Store Name (optional)</Text>
          <View style={styles.inputRow}>
            <Feather name="shopping-bag" size={16} color={Colors.light.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Artisan Bakery & Co."
              placeholderTextColor={Colors.light.textMuted}
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address</Text>
          <View style={[styles.inputRow, styles.inputRowActive]}>
            <Feather name="map-pin" size={16} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="Enter pickup address"
              placeholderTextColor={Colors.light.textMuted}
              value={address}
              onChangeText={setAddress}
              returnKeyType="done"
              onSubmitEditing={() => handleAdd()}
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.scanBtn}
          activeOpacity={0.85}
        >
          <Feather name="camera" size={18} color={Colors.light.primary} />
          <Text style={styles.scanBtnText}>Scan QR Code</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or choose quickly</Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.quickLabel}>Nearby Stores</Text>
        {QUICK_ADDRESSES.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickItem}
            onPress={() => handleAdd(item.address, item.name)}
            activeOpacity={0.85}
          >
            <View style={styles.quickIcon}>
              <Feather name="map-pin" size={14} color={Colors.light.primary} />
            </View>
            <View style={styles.quickText}>
              <Text style={styles.quickName}>{item.name}</Text>
              <Text style={styles.quickAddress}>{item.address}</Text>
            </View>
            <Feather name="plus" size={18} color={Colors.light.primary} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.addBtn, !address && styles.addBtnDisabled]}
          onPress={() => handleAdd()}
          disabled={!address}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>Add Stop</Text>
          <Feather name="check" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  inputRowActive: {
    borderColor: Colors.light.primary,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: `${Colors.light.primary}10`,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: `${Colors.light.primary}30`,
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: -4,
  },
  quickItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: {
    flex: 1,
    gap: 2,
  },
  quickName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  quickAddress: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  addBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  addBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
