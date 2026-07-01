import React from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import Colors from "@/constants/colors";
import { OrderStatus } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";

interface StatusStep {
  key: OrderStatus;
  label: string;
}

const STEPS: StatusStep[] = [
  { key: "confirmed", label: "Order Confirmed" },
  { key: "driver_assigned", label: "Driver Assigned" },
  { key: "en_route_pickup", label: "On the Way to Store" },
  { key: "arrived_pickup", label: "Arrived at Store" },
  { key: "picking_items", label: "Picking Items" },
  { key: "en_route_delivery", label: "On the Way to You" },
  { key: "arrived_delivery", label: "Arrived at Delivery" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_ORDER: OrderStatus[] = [
  "confirmed",
  "driver_assigned",
  "en_route_pickup",
  "arrived_pickup",
  "picking_items",
  "en_route_delivery",
  "arrived_delivery",
  "delivered",
];

const RIDE_STEPS: StatusStep[] = [
  { key: "confirmed", label: "Ride Booked" },
  { key: "driver_assigned", label: "Captain Assigned" },
  { key: "en_route_pickup", label: "Captain on the Way" },
  { key: "arrived_pickup", label: "Captain Arrived" },
  { key: "en_route_delivery", label: "Trip In Progress" },
  { key: "arrived_delivery", label: "Arrived at Destination" },
  { key: "delivered", label: "Trip Completed" },
];

const RIDE_STATUS_ORDER: OrderStatus[] = [
  "confirmed",
  "driver_assigned",
  "en_route_pickup",
  "arrived_pickup",
  "en_route_delivery",
  "arrived_delivery",
  "delivered",
];

interface Props {
  currentStatus: OrderStatus;
  serviceType?: string;
}

export function OrderStatusTimeline({ currentStatus, serviceType }: Props) {
  const isRide = ["bike", "auto", "cab", "cab_prime"].includes(serviceType?.toLowerCase() || "");
  const steps = isRide ? RIDE_STEPS : STEPS;
  const statusOrder = isRide ? RIDE_STATUS_ORDER : STATUS_ORDER;

  let effectiveStatus = currentStatus;
  if (isRide && currentStatus === "picking_items") {
    effectiveStatus = "arrived_pickup";
  }

  const currentIndex = statusOrder.indexOf(effectiveStatus);
  const activeStep = steps[currentIndex] || steps[0];

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  // Pulse animations for the active indicator
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 2.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.singleLineRow}>
        <View style={styles.pulseContainer}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: opacityAnim }]} />
          <View style={styles.pulseDot} />
        </View>
        <Text style={styles.statusLabel}>{activeStep.label}</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  singleLineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}08`,
    borderWidth: 1,
    borderColor: `${colors.primary}15`,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  pulseContainer: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseCircle: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
    zIndex: 2,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  liveBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
