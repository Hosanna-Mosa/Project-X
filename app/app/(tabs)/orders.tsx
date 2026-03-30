import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { ScreenWrapper } from "@/components/ScreenWrapper";

type FilterType = "all" | "active" | "past";

const MOCK_ORDERS = [
  {
    id: "ORD-001",
    type: "Multi-Stop Delivery",
    stops: 2,
    status: "picking_items",
    statusLabel: "Picking Items",
    address: "Artisan Bakery & Co. → The Green Grocer",
    amount: 9.50,
    date: "Today, 12:30 PM",
    isActive: true,
  },
  {
    id: "ORD-002",
    type: "Food Delivery",
    stops: 1,
    status: "delivered",
    statusLabel: "Delivered",
    address: "The Green Kitchen",
    amount: 18.75,
    date: "Yesterday, 6:45 PM",
    isActive: false,
  },
  {
    id: "ORD-003",
    type: "Grocery",
    stops: 1,
    status: "delivered",
    statusLabel: "Delivered",
    address: "City Market, London",
    amount: 34.20,
    date: "Mar 26, 3:15 PM",
    isActive: false,
  },
];

const STATUS_COLORS: Record<string, string> = {
  picking_items: Colors.light.primary,
  on_the_way: Colors.light.teal,
  delivered: Colors.light.success,
  confirmed: Colors.light.warning,
  driver_assigned: "#8B5CF6",
};

export default function OrdersScreen() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = MOCK_ORDERS.filter((o) => {
    if (filter === "active") return o.isActive;
    if (filter === "past") return !o.isActive;
    return true;
  });

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Feather name="sliders" size={18} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(["all", "active", "past"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterBtnText,
                filter === f && styles.filterBtnTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="box" size={48} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptySubtitle}>Your orders will appear here</Text>
          </View>
        ) : (
          filtered.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                if (order.isActive) {
                  router.push("/tracking");
                }
              }}
              activeOpacity={0.88}
            >
              <View style={styles.orderCardTop}>
                <View style={styles.orderTypeIcon}>
                  <Feather
                    name={order.type === "Multi-Stop Delivery" ? "git-branch" : "shopping-bag"}
                    size={16}
                    color={Colors.light.primary}
                  />
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderType}>{order.type}</Text>
                  <Text style={styles.orderId}>{order.id}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${STATUS_COLORS[order.status]}15` },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_COLORS[order.status] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[order.status] },
                    ]}
                  >
                    {order.statusLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={12} color={Colors.light.textMuted} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {order.address}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="clock" size={12} color={Colors.light.textMuted} />
                  <Text style={styles.detailText}>{order.date}</Text>
                </View>
              </View>

              <View style={styles.orderCardBottom}>
                <Text style={styles.orderAmount}>${order.amount.toFixed(2)}</Text>
                {order.isActive && (
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => router.push("/tracking")}
                  >
                    <Text style={styles.trackBtnText}>Track Order</Text>
                    <Feather name="arrow-right" size={12} color={Colors.light.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  filterBtnTextActive: {
    color: "#fff",
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  orderCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: {
    flex: 1,
    gap: 2,
  },
  orderType: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  orderId: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  orderDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  orderCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    paddingTop: 10,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.primary,
  },
});
