import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { OrderStatus } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";

interface StatusStep {
  key: OrderStatus;
  label: string;
  description?: string;
  time?: string;
}

const STEPS: StatusStep[] = [
  { key: "confirmed", label: "Order Confirmed", time: "12:30 PM" },
  { key: "driver_assigned", label: "Driver Assigned", time: "12:32 PM" },
  { key: "en_route_pickup", label: "On the Way to Store" },
  { key: "arrived_pickup", label: "Arrived at Store" },
  {
    key: "picking_items",
    label: "Picking Items",
    description: "Driver is verifying your items at the store",
  },
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
  { key: "confirmed", label: "Ride Booked", time: "12:30 PM" },
  { key: "driver_assigned", label: "Captain Assigned", time: "12:32 PM" },
  { key: "en_route_pickup", label: "Captain on the Way", description: "Captain is heading to your pickup location" },
  { key: "arrived_pickup", label: "Captain Arrived", description: "Captain has arrived at your location" },
  { key: "en_route_delivery", label: "Trip In Progress", description: "Traveling to destination" },
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
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.circle,
                  isDone && styles.circleDone,
                  isActive && styles.circleActive,
                  isPending && styles.circlePending,
                ]}
              >
                {isDone ? (
                  <Feather name="check" size={12} color="#fff" />
                ) : isActive ? (
                  <View style={styles.innerDot} />
                ) : null}
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    isDone && styles.connectorDone,
                  ]}
                />
              )}
            </View>
            <View style={styles.textCol}>
              <View style={styles.labelRow}>
                <Text
                  style={[
                    styles.label,
                    isDone && styles.labelDone,
                    isActive && styles.labelActive,
                    isPending && styles.labelPending,
                  ]}
                >
                  {step.label}
                </Text>
                {isActive && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}
              </View>
              {step.time && (isDone || isActive) && (
                <Text style={styles.time}>{step.time}</Text>
              )}
              {step.description && isActive && (
                <Text style={styles.description}>{step.description}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 40,
  },
  indicatorCol: {
    width: 32,
    alignItems: "center",
  },
  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  circleDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circlePending: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  connectorDone: {
    backgroundColor: colors.primary,
  },
  textCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  labelDone: {
    color: colors.text,
  },
  labelActive: {
    color: colors.primary,
  },
  labelPending: {
    color: colors.textMuted,
  },
  liveBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  description: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
