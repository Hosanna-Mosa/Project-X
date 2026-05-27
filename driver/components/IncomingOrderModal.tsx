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

  useEffect(() => {
    if (incomingOrder) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 10,
      }).start();
    }
  }, [incomingOrder, slideAnim]);

  if (!incomingOrder) return null;

  const isHelper = incomingOrder.serviceType?.toLowerCase() === "helper";

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
              <Text style={styles.title}>{isHelper ? "New Helper!" : "New Request!"}</Text>
              {isHelper && <Text style={styles.subtitle}>Hours Book / Task Specialist</Text>}
            </View>
            <Text style={styles.earnings}>₹{incomingOrder.earnings || "0"}</Text>
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

            {incomingOrder.stops?.map((stop, index) => (
              <View key={`${stop.id || stop.address}-${index}`} style={styles.stopRow}>
                <MaterialIcons
                  name={stop.type === "pickup" ? "my-location" : "location-on"}
                  size={20}
                  color={stop.type === "pickup" ? "#16A34A" : "#EF4444"}
                />
                <Text style={styles.stopAddress} numberOfLines={1}>
                  {stop.address || stop.locationName}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.rejectBtn} onPress={rejectOrder}>
              <Text style={styles.rejectText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={async () => {
                await acceptOrder();
                router.push("/active-order");
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
    maxHeight: height * 0.82,
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
    marginBottom: 16,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
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
  body: {
    maxHeight: height * 0.46,
  },
  bodyContent: {
    paddingBottom: 4,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  stopAddress: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  rejectBtn: {
    flex: 1,
    padding: 16,
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
    padding: 16,
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
