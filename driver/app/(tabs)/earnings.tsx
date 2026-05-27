import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { EarningsChart } from "@/components/EarningsChart";
import { CashOutButton } from "@/components/CashOutButton";
import { TransactionItem } from "@/components/TransactionItem";

const weeklyData = [
  { day: "Mon", amount: 280 },
  { day: "Tue", amount: 340 },
  { day: "Wed", amount: 410 },
  { day: "Thu", amount: 295 },
  { day: "Fri", amount: 385 },
  { day: "Sat", amount: 470 },
  { day: "Sun", amount: 342 },
];

const transactions = [
  { icon: "🚗", label: "Ride — Airport Drop", amount: "+₹12.00", time: "2 hours ago" },
  { icon: "🍕", label: "Delivery — Pizza Hut", amount: "+₹8.50", time: "3 hours ago" },
  { icon: "📦", label: "Delivery — Target", amount: "+₹15.20", time: "5 hours ago" },
];

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Earnings</Text>

        {/* Weekly Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>This Week's Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>₹842.00</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendArrow}>↑</Text>
              <Text style={styles.trendText}>+12%</Text>
            </View>
          </View>
        </View>

        {/* Earnings Chart */}
        <EarningsChart data={weeklyData} />

        {/* Cash Out */}
        <CashOutButton onPress={() => {}} />

        {/* Recent Activity */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {transactions.map((tx, index) => (
            <TransactionItem
              key={index}
              icon={tx.icon}
              label={tx.label}
              amount={tx.amount}
              time={tx.time}
            />
          ))}
        </View>

        {/* Bottom Stats */}
        <View style={styles.bottomStats}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>32.5h</Text>
            <Text style={styles.statLabel}>Online Hours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>412 km</Text>
            <Text style={styles.statLabel}>Total Distance</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    letterSpacing: -0.02,
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
  trendArrow: {
    fontSize: 12,
    color: Colors.success,
    fontFamily: "Inter_700Bold",
  },
  trendText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.success,
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
    letterSpacing: 0.05,
    marginBottom: 4,
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
});
