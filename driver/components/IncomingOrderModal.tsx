import React, { useEffect } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDriverStore } from "@/store/driverStore";

const { height } = Dimensions.get("window");

export default function IncomingOrderModal() {
  const insets = useSafeAreaInsets();
  const { incomingOrder, acceptOrder, rejectOrder } = useDriverStore();
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  const [secondsLeft, setSecondsLeft] = React.useState(15);

  useEffect(() => {
    if (incomingOrder) {
      const totalSeconds = incomingOrder.isReserved ? 60 : 15;
      setSecondsLeft(totalSeconds);
      const timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            rejectOrder();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 10,
      }).start();

      return () => clearInterval(timer);
    }
  }, [incomingOrder, slideAnim, rejectOrder]);

  if (!incomingOrder) return null;

  const isHelper = incomingOrder.serviceType?.toLowerCase() === "helper";
  const isRide = ["bike", "auto", "cab", "cab_prime"].includes(incomingOrder.serviceType?.toLowerCase() || "");
  const maxSeconds = incomingOrder.isReserved ? 60 : 15;

  let modalTitle = "New Request!";
  if (incomingOrder.isReserved) {
    modalTitle = "New Reserved Ride!";
  } else if (isRide) {
    modalTitle = "New Ride Request!";
  } else if (isHelper) {
    modalTitle = "New Helper!";
  } else {
    modalTitle = "New Delivery Request!";
  }

  const formattedDate = incomingOrder.reservedAt ? new Date(incomingOrder.reservedAt).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : "N/A";

  return (
    <Modal visible transparent animationType="none" onRequestClose={rejectOrder}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{modalTitle}</Text>
              {incomingOrder.isReserved ? (
                <Text style={[styles.subtitle, { color: "#1E3A8A", fontWeight: "700" }]}>
                  Scheduled: {formattedDate}
                </Text>
              ) : (
                isHelper && <Text style={styles.subtitle}>Hours Book / Task Specialist</Text>
              )}
            </View>
            <Text style={styles.earnings}>₹{incomingOrder.earnings || "0"}</Text>
          </View>

          {/* Response Timer Bar */}
          <View style={styles.timerContainer}>
            <View style={styles.timerBarBg}>
              <View style={[styles.timerBar, { width: `${(secondsLeft / maxSeconds) * 100}%` }]} />
            </View>
            <Text style={styles.timerText}>Decline auto-triggers in {secondsLeft} seconds</Text>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={19} color="#4B5563" />
                <Text style={styles.detailText}>{incomingOrder.distance || "N/A"}</Text>
              </View>
              {incomingOrder.radius !== undefined && (
                <View style={styles.detailRow}>
                  <Ionicons name="navigate-outline" size={19} color="#4B5563" />
                  <Text style={styles.detailText}>{incomingOrder.radius} km</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={19} color="#4B5563" />
                <Text style={styles.detailText}>{incomingOrder.duration || "N/A"}</Text>
              </View>
            </View>

            {/* Route Details */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>ROUTE</Text>
              {incomingOrder.stops?.map((stop, index) => (
                <View key={`${stop.id || stop.address}-${index}`} style={styles.stopRow}>
                  <MaterialIcons
                    name={stop.type === "pickup" ? "my-location" : "location-on"}
                    size={20}
                    color={stop.type === "pickup" ? "#16A34A" : "#EF4444"}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.stopLocationName}>
                      {stop.locationName || (stop.type === "pickup" ? "Restaurant" : "Customer")}
                    </Text>
                    <Text style={styles.stopAddress} numberOfLines={1}>
                      {stop.address}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Items Checklist Display */}
            {!isHelper && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>ITEMS TO PICK UP</Text>
                {incomingOrder.stops
                  ?.filter((stop) => stop.type === "pickup" && stop.items && stop.items.length > 0)
                  .map((stop, sIdx) => (
                    <View key={stop.id || sIdx} style={styles.itemsRestaurantBlock}>
                      <Text style={styles.itemsRestaurantName}>{stop.locationName}</Text>
                      {stop.items?.map((item: any, idx: number) => (
                        <Text key={idx} style={styles.itemRowText}>
                          • {item.quantity}x {item.name}
                        </Text>
                      ))}
                    </View>
                  ))}
              </View>
            )}

            {/* Payment Mode */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
              <View style={styles.paymentRow}>
                <Ionicons name="card-outline" size={18} color="#16A34A" />
                <Text style={styles.paymentText}>Prepaid (Online Payment)</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.rejectBtn} onPress={rejectOrder}>
              <Text style={styles.rejectText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={async () => {
                const isReserved = incomingOrder.isReserved;
                await acceptOrder();
                if (!isReserved) {
                  router.push("/active-order");
                }
              }}
            >
              <Text style={styles.acceptText}>Accept Order</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },
  earnings: {
    fontSize: 24,
    fontWeight: "800",
    color: "#16A34A",
  },
  timerContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  timerBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  timerBar: {
    height: "100%",
    backgroundColor: "#EF4444",
  },
  timerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  body: {
    maxHeight: height * 0.46,
  },
  bodyContent: {
    paddingBottom: 16,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 8,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  stopLocationName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  stopAddress: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 1,
  },
  itemsRestaurantBlock: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  itemsRestaurantName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 4,
  },
  itemRowText: {
    fontSize: 13,
    color: "#374151",
    paddingLeft: 4,
    paddingVertical: 1,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  paymentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  rejectBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  rejectText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  acceptBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  acceptText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
