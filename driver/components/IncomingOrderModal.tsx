import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Colors } from "@/constants/colors";
import { Order } from "@/store/driverStore";

interface IncomingOrderModalProps {
  order: Order | null;
  onAccept: () => void;
  onReject: () => void;
}

const { height } = Dimensions.get("window");

export default function IncomingOrderModal({
  order,
  onAccept,
  onReject,
}: IncomingOrderModalProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (order) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [order]);

  if (!order) return null;

  const pickups = order.stops.filter((s) => s.type === "pickup");
  const deliveries = order.stops.filter((s) => s.type === "delivery");

  return (
    <Modal transparent animationType="none" visible={!!order}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />

          <Animated.View
            style={[styles.header, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={styles.newOrderBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.newOrderText}>New Order</Text>
            </View>
          </Animated.View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                <Feather name="map-pin" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{order.distance}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: "#EDE9FE" }]}>
                <Feather name="package" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{order.stops.length}</Text>
              <Text style={styles.statLabel}>Stops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: Colors.successLight }]}>
                <Feather name="dollar-sign" size={18} color={Colors.success} />
              </View>
              <Text style={styles.statValue}>₹{order.earnings}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
          </View>

          <View style={styles.routeContainer}>
            <Text style={styles.routeLabel}>Route Overview</Text>
            {pickups.map((stop, idx) => (
              <View key={stop.id} style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.routeDotText}>{idx + 1}</Text>
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeType}>Pickup {idx + 1}</Text>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {stop.locationName}
                  </Text>
                </View>
              </View>
            ))}
            {deliveries.map((stop, idx) => (
              <View key={stop.id} style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: Colors.success }]}>
                  <Feather name="home" size={12} color={Colors.white} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeType}>Deliver</Text>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {stop.locationName}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.etaRow}>
            <Feather name="clock" size={14} color={Colors.textSecondary} />
            <Text style={styles.etaText}>Est. {order.duration} total</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onReject();
              }}
            >
              <Feather name="x" size={22} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                onAccept();
              }}
            >
              <Text style={styles.acceptText}>Accept Order</Text>
              <Feather name="check" size={20} color={Colors.white} />
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
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  newOrderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  newOrderText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  routeContainer: {
    gap: 12,
    marginBottom: 16,
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  routeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  routeDotText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  routeInfo: {
    flex: 1,
  },
  routeType: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  routeAddress: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600",
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  etaText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  rejectButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.errorLight,
  },
  acceptButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
});
