import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { customFetch } from "@/utils/api/custom-fetch";
import { useDeliveryStore } from "@/contexts/deliveryStore";
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

const getServiceLabel = (type: string) => {
  switch (type) {
    case "bike": return "Bike Ride";
    case "auto": return "Auto Ride";
    case "cab": return "Cab Ride";
    case "cab_prime": return "Cab Prime Ride";
    case "helper": return "Helper Booking";
    case "delivery": return "Delivery Service";
    default: return "Delivery";
  }
};

export default function OrdersScreen() {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const [filter, setFilter] = useState<FilterType>("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any[]>("/api/v1/orders");
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
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            }}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>My Orders</Text>
        </View>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Feather name="sliders" size={18} color={colors.text} />
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
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptySubtitle}>Loading your orders...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="box" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptySubtitle}>Your orders will appear here</Text>
          </View>
        ) : (
          filtered.map((order) => {
            const isActive = ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "PICKED_UP", "ON_THE_WAY", "EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "PICKING_ITEMS", "EN_ROUTE_DELIVERY", "ARRIVED_DELIVERY", "IN_TRANSIT"].includes(order.status);
            const isRide = ["bike", "auto", "cab", "cab_prime"].includes(order.serviceType);
            const iconName = isRide ? "map-pin" : (order.stops?.length > 1 ? "git-branch" : "shopping-bag");
            
            const serviceLabel = getServiceLabel(order.serviceType);
            const orderTitle = order.isReserved 
              ? `Reserved ${serviceLabel}`
              : (order.serviceType === "delivery" 
                ? (order.stops?.length > 1 ? "Multi-Stop Delivery" : "Single Stop Delivery") 
                : serviceLabel);

            return (
              <TouchableOpacity
                key={order._id}
                style={[
                  styles.orderCard,
                  order.isReserved && isActive && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                  if (isActive) {
                    const { setServiceType } = useDeliveryStore.getState();
                    setServiceType(order.serviceType || "delivery");
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
                      name={iconName}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderType}>{orderTitle}</Text>
                    <Text style={styles.orderId}>{order._id.startsWith("ORD-") ? order._id : order._id.substring(order._id.length - 8).toUpperCase()}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${STATUS_COLORS[order.status] || colors.textMuted}15` },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: STATUS_COLORS[order.status] || colors.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLORS[order.status] || colors.textMuted },
                      ]}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  {order.isReserved && (
                    <View style={styles.scheduledBadge}>
                      <Feather name="calendar" size={12} color={colors.primary} />
                      <Text style={styles.scheduledBadgeText}>
                        Scheduled: {new Date(order.reservedAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Feather name="map-pin" size={12} color={colors.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {order.stops?.map((s: any) => s.address).join(" → ")}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="clock" size={12} color={colors.textMuted} />
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
                      <Feather name="arrow-right" size={12} color={colors.primary} />
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

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  filterIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
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
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.06 : 0.2,
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
    backgroundColor: `${colors.primary}15`,
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
    color: colors.text,
  },
  orderId: {
    fontSize: 10,
    color: colors.textMuted,
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
    color: colors.textSecondary,
  },
  orderCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trackBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    marginBottom: 4,
  },
  scheduledBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
});
