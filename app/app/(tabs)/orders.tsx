import React, { useEffect, useState } from "react";
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
import { customFetch } from "@/utils/api/custom-fetch";
import { ActivityIndicator } from "react-native";

type FilterType = "all" | "active" | "past";

const STATUS_COLORS: Record<string, string> = {
  picking_items: Colors.light.primary,
  on_the_way: Colors.light.teal,
  delivered: Colors.light.success,
  confirmed: Colors.light.warning,
  driver_assigned: "#8B5CF6",
  SEARCHING_DRIVER: Colors.light.warning,
  DRIVER_ASSIGNED: "#8B5CF6",
  PICKED_UP: Colors.light.teal,
  DELIVERED: Colors.light.success,
  CANCELLED: Colors.light.error,
};

const STATUS_LABELS: Record<string, string> = {
  SEARCHING_DRIVER: "Searching Driver",
  DRIVER_ASSIGNED: "Driver Assigned",
  PICKED_UP: "Picked Up",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function OrdersScreen() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any[]>("/api/orders");
      if (data) setOrders(data);
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter((o) => {
    const isActive = ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "PICKED_UP"].includes(o.status);
    if (filter === "active") return isActive;
    if (filter === "past") return !isActive;
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
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.emptySubtitle}>Loading your orders...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="box" size={48} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptySubtitle}>Your orders will appear here</Text>
          </View>
        ) : (
          filtered.map((order) => {
            const isActive = ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "PICKED_UP"].includes(order.status);
            return (
              <TouchableOpacity
                key={order._id}
                style={styles.orderCard}
                onPress={() => {
                  if (isActive) {
                    router.push({
                      pathname: "/tracking",
                      params: { orderId: order._id }
                    });
                  }
                }}
                activeOpacity={0.88}
              >
                <View style={styles.orderCardTop}>
                  <View style={styles.orderTypeIcon}>
                    <Feather
                      name={order.stops?.length > 1 ? "git-branch" : "shopping-bag"}
                      size={16}
                      color={Colors.light.primary}
                    />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderType}>{order.stops?.length > 1 ? "Multi-Stop Delivery" : "Single Stop Delivery"}</Text>
                    <Text style={styles.orderId}>{order._id.substring(order._id.length - 8).toUpperCase()}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${STATUS_COLORS[order.status] || Colors.light.textMuted}15` },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: STATUS_COLORS[order.status] || Colors.light.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLORS[order.status] || Colors.light.textMuted },
                      ]}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.detailRow}>
                    <Feather name="map-pin" size={12} color={Colors.light.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {order.stops?.map((s: any) => s.address).join(" → ")}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="clock" size={12} color={Colors.light.textMuted} />
                    <Text style={styles.detailText}>{new Date(order.createdAt).toLocaleString()}</Text>
                  </View>
                </View>

                <View style={styles.orderCardBottom}>
                  <Text style={styles.orderAmount}>${(order.totalPrice || 0).toFixed(2)}</Text>
                  {isActive && (
                    <TouchableOpacity
                      style={styles.trackBtn}
                      onPress={() => router.push({
                        pathname: "/tracking",
                        params: { orderId: order._id }
                      })}
                    >
                      <Text style={styles.trackBtnText}>Track Order</Text>
                      <Feather name="arrow-right" size={12} color={Colors.light.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
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
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  filterIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterBtnText: {
    fontSize: 11,
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
    borderRadius: 12,
    padding: 10,
    gap: 10,
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
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: {
    flex: 1,
    gap: 2,
  },
  orderType: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.text,
  },
  orderId: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
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
    fontSize: 11,
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
    fontSize: 14,
    fontWeight: "800",
    color: Colors.light.text,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trackBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.primary,
  },
});
