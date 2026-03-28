import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { CompletedOrder, useDriverStore } from "@/store/driverStore";

function formatTime(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function OrderHistoryItem({ item }: { item: CompletedOrder }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderLeft}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={16} color={Colors.white} />
        </View>
        <View style={styles.connector} />
      </View>
      <View style={styles.orderContent}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>{item.id}</Text>
          <Text style={styles.orderTime}>
            {formatTime(new Date(item.completedAt))}
          </Text>
        </View>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <View style={styles.orderMeta}>
          <View style={styles.metaBadge}>
            <Feather name="map-pin" size={11} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{item.distance}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Feather name="package" size={11} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{item.stops} stops</Text>
          </View>
        </View>
        <View style={styles.earningsRow}>
          <Text style={styles.earningsAmount}>₹{item.earnings}</Text>
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { orderHistory, earnings } = useDriverStore();

  const totalEarned = orderHistory.reduce((sum, o) => sum + o.earnings, 0);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          },
        ]}
      >
        <Text style={styles.pageTitle}>Order History</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{orderHistory.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₹{totalEarned}</Text>
            <Text style={styles.summaryLabel}>Earned</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {orderHistory.length
                ? Math.round(totalEarned / orderHistory.length)
                : 0}
            </Text>
            <Text style={styles.summaryLabel}>Avg/Order</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={orderHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderHistoryItem item={item} />}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="clock" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No deliveries yet</Text>
            <Text style={styles.emptyText}>
              Complete your first delivery to see it here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 0,
  },
  orderCard: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 4,
  },
  orderLeft: {
    alignItems: "center",
    width: 36,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 4,
    minHeight: 20,
  },
  orderContent: {
    flex: 1,
    paddingBottom: 20,
    gap: 6,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  orderTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  orderMeta: {
    flexDirection: "row",
    gap: 10,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.success,
  },
  completedBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
