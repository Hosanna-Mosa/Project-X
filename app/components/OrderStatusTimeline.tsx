import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { OrderStatus } from "@/contexts/deliveryStore";

interface StatusStep {
  key: OrderStatus;
  label: string;
  description?: string;
  time?: string;
}

const STEPS: StatusStep[] = [
  { key: "confirmed", label: "Order Confirmed", time: "12:30 PM" },
  { key: "driver_assigned", label: "Driver Assigned", time: "12:32 PM" },
  {
    key: "picking_items",
    label: "Picking Items",
    description: "John is verifying your items at the store",
    time: "12:38 PM",
  },
  { key: "on_the_way", label: "On the Way" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_ORDER: OrderStatus[] = [
  "confirmed",
  "driver_assigned",
  "picking_items",
  "on_the_way",
  "delivered",
];

interface Props {
  currentStatus: OrderStatus;
}

export function OrderStatusTimeline({ currentStatus }: Props) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 60,
  },
  indicatorCol: {
    width: 32,
    alignItems: "center",
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  circleDone: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  circleActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  circlePending: {
    backgroundColor: Colors.light.surfaceSecondary,
    borderColor: Colors.light.border,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  connectorDone: {
    backgroundColor: Colors.light.primary,
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
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.textMuted,
  },
  labelDone: {
    color: Colors.light.text,
  },
  labelActive: {
    color: Colors.light.primary,
  },
  labelPending: {
    color: Colors.light.textMuted,
  },
  liveBadge: {
    backgroundColor: Colors.light.primary,
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
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
});
