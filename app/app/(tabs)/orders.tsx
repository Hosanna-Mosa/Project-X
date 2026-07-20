import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { customFetch } from "@/utils/api/custom-fetch";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useCartStore } from "@/contexts/cartStore";
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

  // Review Modal state
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSelectedTags, setReviewSelectedTags] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleOpenReviewModal = (order: any) => {
    setSelectedOrderForReview(order);
    setReviewRating(5);
    setReviewComment("");
    setReviewSelectedTags([]);
    setReviewModalVisible(true);
  };

  const handleToggleReviewTag = (tag: string) => {
    if (reviewSelectedTags.includes(tag)) {
      setReviewSelectedTags(reviewSelectedTags.filter((t) => t !== tag));
    } else {
      setReviewSelectedTags([...reviewSelectedTags, tag]);
    }
  };

  const handleSubmitReviewFromModal = async () => {
    if (!selectedOrderForReview) return;
    try {
      setSubmittingReview(true);
      const res = await customFetch<any>("/api/v1/reviews", {
        method: "POST",
        body: JSON.stringify({
          orderId: selectedOrderForReview._id,
          rating: reviewRating,
          comment: reviewComment,
          tags: reviewSelectedTags,
        }),
      });

      if (res) {
        Alert.alert("Thank You!", "Your rating has been submitted.");
        setOrders((prevOrders) =>
          prevOrders.map((o) =>
            o._id === selectedOrderForReview._id ? { ...o, isReviewed: true } : o
          )
        );
        setReviewModalVisible(false);
        setSelectedOrderForReview(null);
      }
    } catch (err: any) {
      console.error("Submit review modal error:", err);
      Alert.alert("Error", err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

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

  const handleReorder = (order: any) => {
    if (order.serviceType === "delivery") {
      const { clearCart, addItem, updateQuantity } = useCartStore.getState();
      clearCart();
      const vendorId = typeof order.vendor === "object" ? order.vendor._id : order.vendor;
      
      const dropStop = order.stops?.find((s: any) => s.type === "drop");
      if (dropStop && Array.isArray(dropStop.items)) {
        dropStop.items.forEach((item: any) => {
          addItem({ 
            _id: item.id || item._id, 
            name: item.name, 
            price: item.price, 
            description: "", 
            category: "", 
            isVeg: true, 
            images: [] 
          }, vendorId);
          updateQuantity(item.id || item._id, item.quantity);
        });
      }
      
      const { getTotalPrice } = useCartStore.getState();
      const subtotal = getTotalPrice() || order.totalPrice;
      const deliveryFee = 0.99;
      const taxes = subtotal * 0.05;
      const total = subtotal + deliveryFee + taxes;
      
      router.push({
        pathname: "/checkout",
        params: { subtotal, deliveryFee, taxes, total }
      });
    } else {
      const pickup = order.stops?.find((s: any) => s.type === "pickup") || order.stops?.[0];
      const drop = order.stops?.find((s: any) => s.type === "drop") || order.stops?.[order.stops.length - 1];
      const middleStops = order.stops?.filter((s: any) => s.type === "stop") || [];

      if (!pickup || !drop) {
        console.warn("Invalid stops for reordering ride", order.stops);
        return;
      }

      router.push({
        pathname: "/ride-confirmation",
        params: {
          serviceId: order.serviceType,
          pickupName: pickup.address || "Pickup",
          pickupLat: pickup.location?.coordinates?.[1] || 0,
          pickupLng: pickup.location?.coordinates?.[0] || 0,
          dropName: drop.address || "Drop",
          dropLat: drop.location?.coordinates?.[1] || 0,
          dropLng: drop.location?.coordinates?.[0] || 0,
          stops: JSON.stringify(middleStops.map((s: any) => ({
            name: s.address || "Stop",
            lat: s.location?.coordinates?.[1] || 0,
            lng: s.location?.coordinates?.[0] || 0
          })))
        }
      });
    }
  };

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
                  {!isActive && (
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      {["DELIVERED", "COMPLETED", "delivered", "completed"].includes(order.status) && (
                        order.isReviewed ? (
                          <View style={[styles.reviewedBadge, { backgroundColor: "#F59E0B15" }]}>
                            <Feather name="star" size={12} color="#F59E0B" />
                            <Text style={[styles.reviewedText, { color: "#F59E0B" }]}>Rated</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.rateBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "10" }]}
                            onPress={() => handleOpenReviewModal(order)}
                          >
                            <Feather name="star" size={12} color={colors.primary} />
                            <Text style={[styles.rateBtnText, { color: colors.primary }]}>Rate</Text>
                          </TouchableOpacity>
                        )
                      )}
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() => handleReorder(order)}
                      >
                        <Text style={styles.trackBtnText}>Reorder</Text>
                        <Feather name="refresh-cw" size={12} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Rate Your Order</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
              How was your experience with order #{selectedOrderForReview?._id?.slice(-8).toUpperCase()}?
            </Text>

            {/* Star Rating */}
            <View style={{ flexDirection: "row", gap: 10, marginVertical: 8, justifyContent: "center", width: "100%" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Feather
                    name="star"
                    size={32}
                    color={star <= reviewRating ? "#F59E0B" : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Feedback Tags */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 10, justifyContent: "center" }}>
              {(["⚡ On Time", "😊 Polite Partner", "🍱 Great Quality", "📦 Well Packaged", "🚗 Safe Trip"] as string[]).map((tag) => {
                const isSelected = reviewSelectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.modalTagChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleToggleReviewTag(tag)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "500", color: isSelected ? "#FFFFFF" : colors.text }}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Comment */}
            <TextInput
              style={[
                styles.modalCommentInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Add feedback comment (optional)..."
              placeholderTextColor={colors.textMuted}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={2}
            />

            {/* Modal Actions */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16, width: "100%" }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary, opacity: submittingReview ? 0.7 : 1 }]}
                onPress={handleSubmitReviewFromModal}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  rateBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  reviewedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalCommentInput: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    marginTop: 6,
    textAlignVertical: "top",
    minHeight: 50,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
