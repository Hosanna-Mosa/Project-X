import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { earnings } = useDriverStore();

  const maxAmount = Math.max(...earnings.weeklyBreakdown.map((d) => d.amount));
  const today = earnings.weeklyBreakdown[earnings.weeklyBreakdown.length - 1];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Earnings</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total This Week</Text>
        <Text style={styles.heroAmount}>₹{earnings.week.toLocaleString()}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Feather name="package" size={16} color={Colors.primaryLight} />
            <Text style={styles.heroStatText}>
              {earnings.totalDeliveries} deliveries
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Feather name="trending-up" size={16} color={Colors.primaryLight} />
            <Text style={styles.heroStatText}>
              ₹{Math.round(earnings.week / 7)}/day avg
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.todayRow}>
        <View style={[styles.todayCard, { backgroundColor: Colors.successLight }]}>
          <View style={[styles.todayIcon, { backgroundColor: Colors.success }]}>
            <Feather name="sun" size={20} color={Colors.white} />
          </View>
          <Text style={styles.todayAmount}>₹{earnings.today}</Text>
          <Text style={styles.todayLabel}>Today</Text>
        </View>
        <View style={[styles.todayCard, { backgroundColor: Colors.primaryLight }]}>
          <View style={[styles.todayIcon, { backgroundColor: Colors.primary }]}>
            <Feather name="calendar" size={20} color={Colors.white} />
          </View>
          <Text style={styles.todayAmount}>
            ₹{Math.round(earnings.week / 7)}
          </Text>
          <Text style={styles.todayLabel}>Daily Avg</Text>
        </View>
        <View style={[styles.todayCard, { backgroundColor: "#EDE9FE" }]}>
          <View style={[styles.todayIcon, { backgroundColor: "#8B5CF6" }]}>
            <Feather name="award" size={20} color={Colors.white} />
          </View>
          <Text style={styles.todayAmount}>{earnings.totalDeliveries}</Text>
          <Text style={styles.todayLabel}>Total Orders</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chart}>
            {earnings.weeklyBreakdown.map((day, idx) => {
              const heightPct = (day.amount / maxAmount) * 100;
              const isToday = idx === earnings.weeklyBreakdown.length - 1;
              return (
                <View key={day.day} style={styles.barGroup}>
                  <Text style={styles.barAmount}>
                    {isToday ? `₹${day.amount}` : ""}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(heightPct, 8)}%`,
                          backgroundColor: isToday
                            ? Colors.primary
                            : Colors.primaryLight,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                    {day.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        <View style={styles.breakdownList}>
          {[
            {
              label: "Base Earnings",
              amount: Math.round(earnings.week * 0.65),
              icon: "dollar-sign" as const,
              color: Colors.primary,
            },
            {
              label: "Surge Bonus",
              amount: Math.round(earnings.week * 0.2),
              icon: "zap" as const,
              color: Colors.warning,
            },
            {
              label: "Tip Earnings",
              amount: Math.round(earnings.week * 0.1),
              icon: "heart" as const,
              color: Colors.success,
            },
            {
              label: "Incentives",
              amount: Math.round(earnings.week * 0.05),
              icon: "award" as const,
              color: "#8B5CF6",
            },
          ].map((item, idx) => (
            <View key={idx} style={styles.breakdownItem}>
              <View
                style={[
                  styles.breakdownIcon,
                  { backgroundColor: item.color + "22" },
                ]}
              >
                <Feather name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={styles.breakdownAmount}>₹{item.amount}</Text>
            </View>
          ))}
          <View style={[styles.breakdownItem, styles.breakdownTotal]}>
            <View style={[styles.breakdownIcon, { backgroundColor: Colors.text + "11" }]}>
              <Feather name="bar-chart-2" size={18} color={Colors.text} />
            </View>
            <Text style={[styles.breakdownLabel, styles.breakdownTotalText]}>
              Total
            </Text>
            <Text style={[styles.breakdownAmount, styles.breakdownTotalText]}>
              ₹{earnings.week}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 24,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroLabel: {
    fontSize: 14,
    color: Colors.primaryLight,
    fontWeight: "500",
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: "800",
    color: Colors.white,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroStatText: {
    fontSize: 14,
    color: Colors.primaryLight,
    fontWeight: "500",
  },
  heroDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.primaryLight,
    opacity: 0.5,
  },
  todayRow: {
    flexDirection: "row",
    gap: 12,
  },
  todayCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  todayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  todayAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  todayLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    height: 180,
  },
  chart: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    gap: 6,
  },
  barAmount: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: "700",
    minHeight: 12,
  },
  barWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: 6,
    width: "100%",
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  dayLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  breakdownList: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: "hidden",
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  breakdownTotal: {
    borderBottomWidth: 0,
    backgroundColor: Colors.surfaceAlt,
  },
  breakdownTotalText: {
    fontWeight: "800",
    fontSize: 17,
  },
});
