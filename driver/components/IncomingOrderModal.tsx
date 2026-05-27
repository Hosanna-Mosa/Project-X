import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { useDriverStore } from "@/store/driverStore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const { height } = Dimensions.get("window");

export default function IncomingOrderModal() {
  const { incomingOrder, acceptOrder, rejectOrder } = useDriverStore();
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (incomingOrder) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [incomingOrder]);

  // We render it but hide it off-screen when not active so animation works smoothly
  if (!incomingOrder) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.modal, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.newOrderText}>
              {incomingOrder.serviceType?.toLowerCase() === "helper" ? "New Helper!" : "New Request!"}
            </Text>
            {incomingOrder.serviceType?.toLowerCase() === "helper" && (
              <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "600", marginTop: 2 }}>Hours Book / Task Specialist</Text>
            )}
          </View>
          <Text style={styles.earnings}>₹{incomingOrder.earnings || "0"}</Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{incomingOrder.distance || "N/A"}</Text>
          </View>
          {incomingOrder.radius !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="navigate-outline" size={20} color="#666" />
              <Text style={styles.detailText}>{incomingOrder.radius} km Rad</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{incomingOrder.duration || "N/A"}</Text>
          </View>
        </View>

        {incomingOrder.stops?.map((stop, index) => (
          <View key={index} style={styles.stopRow}>
            <MaterialIcons 
              name={stop.type === "pickup" ? "my-location" : "location-on"} 
              size={20} 
              color={stop.type === "pickup" ? "#4CAF50" : "#F44336"} 
            />
            <Text style={styles.stopAddress} numberOfLines={1}>{stop.address || stop.locationName}</Text>
          </View>
        ))}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.rejectBtn} onPress={rejectOrder}>
            <Text style={styles.rejectText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={async () => {
            await acceptOrder();
            router.push("/active-order");
          }}>
            <Text style={styles.acceptText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  newOrderText: { fontSize: 24, fontWeight: "800", color: "#111827" },
  earnings: { fontSize: 24, fontWeight: "800", color: "#4CAF50" },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 16, fontWeight: "600", color: "#4B5563" },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
    paddingHorizontal: 10,
  },
  stopAddress: { fontSize: 15, color: "#374151", flex: 1 },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  rejectBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  rejectText: { fontSize: 16, fontWeight: "700", color: "#4B5563" },
  acceptBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  acceptText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
