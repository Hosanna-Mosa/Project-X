import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface StatItem {
  label: string;
  value: string;
  accent?: boolean;
}

interface PerformanceCardProps {
  stats: StatItem[];
}

export function PerformanceCard({ stats }: PerformanceCardProps) {
  const getIconForStat = (label: string) => {
    switch (label.toLowerCase()) {
      case 'trips':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#eefaff' }]}>
            <Feather name="navigation" size={18} color="#0ea5e9" />
          </View>
        );
      case 'balance':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#ebfaf0' }]}>
            <MaterialCommunityIcons name="wallet-outline" size={20} color={Colors.success} />
          </View>
        );
      case 'this week':
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#fff5e6' }]}>
            <Feather name="trending-up" size={18} color="#f59e0b" />
          </View>
        );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Performance</Text>
        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>This Week</Text>
          <Feather name="chevron-down" size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <View style={styles.statIconContainer}>
              {getIconForStat(stat.label)}
            </View>
            <Text style={styles.statValue}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  dropdownText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statIconContainer: {
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
  },
});
