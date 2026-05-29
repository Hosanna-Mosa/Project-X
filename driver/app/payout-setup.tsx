import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import Colors from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PayoutSetupScreen() {
  const insets = useSafeAreaInsets();
  const token = useDriverStore((s) => s.token);
  const params = useLocalSearchParams<{
    account?: string;
    ifsc?: string;
  }>();

  const [accountNumber, setAccountNumber] = useState(params.account || "");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [ifsc, setIfsc] = useState(params.ifsc || "");
  const [saving, setSaving] = useState(false);

  const accountsMatch = accountNumber === confirmAccount;
  const canSave =
    accountNumber.length >= 9 &&
    accountsMatch &&
    ifsc.length >= 8 &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;

    if (!token) {
      Alert.alert("Session expired", "Please sign in again.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankAccountNumber: accountNumber,
          bankIfsc: ifsc,
          bankVerified: true,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        useDriverStore.getState().logout();
        router.replace("/auth");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save bank details");
      }

      Alert.alert("Bank details saved", "Your payout account has been set up. You can now cash out your earnings.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not save bank details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Payout Setup</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Notice */}
          <View style={styles.notice}>
            <View style={styles.noticeIcon}>
              <Feather name="shield" size={17} color={Colors.success} />
            </View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Secure payout setup</Text>
              <Text style={styles.noticeText}>
                Add the account where your delivery earnings should be settled. Make sure the details are correct.
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Account Number</Text>
              <View style={styles.inputContainer}>
                <Feather name="credit-card" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  value={accountNumber}
                  onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, "").slice(0, 18))}
                  placeholder="Enter account number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Account Number</Text>
              <View style={styles.inputContainer}>
                <Feather name="check-square" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  value={confirmAccount}
                  onChangeText={(t) => setConfirmAccount(t.replace(/[^0-9]/g, "").slice(0, 18))}
                  placeholder="Re-enter account number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {confirmAccount.length > 0 && !accountsMatch && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={15} color={Colors.error} />
                <Text style={styles.errorText}>Account numbers don't match</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>IFSC Code</Text>
              <View style={styles.inputContainer}>
                <Feather name="map-pin" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  value={ifsc}
                  onChangeText={(t) => setIfsc(t.toUpperCase().slice(0, 11))}
                  placeholder="SBIN0001234"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom save button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Bank Details</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#f1fbf5",
    borderWidth: 1,
    borderColor: "#b8e6ca",
    borderRadius: 14,
    padding: 14,
  },
  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeCopy: {
    flex: 1,
    gap: 3,
  },
  noticeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  noticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  card: {
    gap: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.text,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.white,
  },
});
