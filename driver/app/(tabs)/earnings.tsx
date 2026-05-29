import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import Colors from "@/constants/colors";
import { EarningsChart } from "@/components/EarningsChart";
import { CashOutButton } from "@/components/CashOutButton";
import { TransactionItem } from "@/components/TransactionItem";
import { useDriverStore } from "@/store/driverStore";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

interface WeeklyPoint {
  day: string;
  amount: number;
}

interface ActivityItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  amount: number;
  createdAt: string;
}

interface EarningsResponse {
  availableBalance: number;
  weekBalance: number;
  trendPercent: number;
  weeklyBreakdown: WeeklyPoint[];
  recentActivity: ActivityItem[];
  stats: {
    onlineHours: number;
    totalDistance: number;
    completedTrips: number;
  };
  bank: {
    verified: boolean;
    last4: string | null;
    ifsc: string | null;
  };
}

const emptyEarnings: EarningsResponse = {
  availableBalance: 0,
  weekBalance: 0,
  trendPercent: 0,
  weeklyBreakdown: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    amount: 0,
  })),
  recentActivity: [],
  stats: {
    onlineHours: 0,
    totalDistance: 0,
    completedTrips: 0,
  },
  bank: {
    verified: false,
    last4: null,
    ifsc: null,
  },
};

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const token = useDriverStore((s) => s.token);
  const [earnings, setEarnings] = useState<EarningsResponse>(emptyEarnings);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [password, setPassword] = useState("");
  const [cashOutVisible, setCashOutVisible] = useState(false);

  const loadEarnings = useCallback(async (refreshing = false) => {
    if (!apiUrl || !token) {
      setEarnings(emptyEarnings);
      setIsLoading(false);
      return;
    }

    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/drivers/earnings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load earnings");
      setEarnings(data);
    } catch (error: any) {
      Alert.alert("Earnings unavailable", error.message || "Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadEarnings(true);
    }, [loadEarnings])
  );

  const trendLabel = useMemo(() => {
    const prefix = earnings.trendPercent >= 0 ? "+" : "";
    return `${prefix}${earnings.trendPercent}%`;
  }, [earnings.trendPercent]);

  const handleCashOut = async () => {
    if (!password.trim()) {
      Alert.alert("Password required", "Enter your driver password to continue.");
      return;
    }

    if (!apiUrl || !token) {
      Alert.alert("Cash out unavailable", "Please sign in again.");
      return;
    }

    setIsCashingOut(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/drivers/cash-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password,
          amount: earnings.availableBalance,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Cash out failed");

      setCashOutVisible(false);
      setPassword("");
      Alert.alert("Cash out initiated", `Rs.${data.payout.amount.toFixed(2)} is being sent to your bank.`);
      await loadEarnings();
    } catch (error: any) {
      Alert.alert("Cash out failed", error.message || "Please try again.");
    } finally {
      setIsCashingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadEarnings(true)} />
        }
      >
        <Text style={styles.headerTitle}>Earnings</Text>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>This Week's Balance</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceAmount}>{formatCurrency(earnings.weekBalance)}</Text>
                <View style={styles.trendBadge}>
                  <Feather
                    name={earnings.trendPercent >= 0 ? "arrow-up" : "arrow-down"}
                    size={12}
                    color={Colors.success}
                  />
                  <Text style={styles.trendText}>{trendLabel}</Text>
                </View>
              </View>
              <Text style={styles.availableText}>
                Available: {formatCurrency(earnings.availableBalance)}
                {earnings.bank.last4 ? ` to bank ending ${earnings.bank.last4}` : ""}
              </Text>
            </View>

            <EarningsChart data={earnings.weeklyBreakdown} />

            <CashOutButton
              onPress={() => {
                if (!earnings.bank.verified) {
                  Alert.alert(
                    "Bank details required",
                    "You need to add your payout bank details before you can cash out. Would you like to set them up now?",
                    [
                      { text: "Not now", style: "cancel" },
                      { text: "Add Bank Details", onPress: () => router.push("/payout-setup") },
                    ]
                  );
                } else if (earnings.availableBalance < 100) {
                  Alert.alert(
                    "Minimum balance required",
                    `You need at least Rs.100 to cash out. Your current available balance is ${formatCurrency(earnings.availableBalance)}.`
                  );
                } else {
                  setCashOutVisible(true);
                }
              }}
              isLoading={isCashingOut}
            />

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {earnings.recentActivity.length === 0 ? (
                <Text style={styles.emptyText}>No completed earnings yet.</Text>
              ) : (
                earnings.recentActivity.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    icon={tx.icon}
                    label={tx.label}
                    amount={`${tx.amount >= 0 ? "+" : "-"}${formatCurrency(Math.abs(tx.amount))}`}
                    time={formatRelativeTime(tx.createdAt)}
                  />
                ))
              )}
            </View>

            <View style={styles.bottomStats}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{earnings.stats.onlineHours.toFixed(1)}h</Text>
                <Text style={styles.statLabel}>Online Hours</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{earnings.stats.totalDistance} km</Text>
                <Text style={styles.statLabel}>Total Distance</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={cashOutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCashOutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Cash Out</Text>
            <Text style={styles.modalText}>
              {formatCurrency(earnings.availableBalance)} will be transferred through Razorpay.
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Driver password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              style={styles.passwordInput}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setCashOutVisible(false)}
                disabled={isCashingOut}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={handleCashOut}
                disabled={isCashingOut}
              >
                {isCashingOut ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatCurrency(amount: number) {
  return `\u20b9${Number(amount || 0).toFixed(2)}`;
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
    marginBottom: 4,
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.text,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  trendText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.success,
  },
  availableText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },

  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 12,
  },
  bottomStats: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 6,
  },
  modalText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerLow,
  },
  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  primaryButton: {
    minWidth: 88,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.white,
  },
});
