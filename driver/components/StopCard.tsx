import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { Stop } from "@/store/driverStore";

interface StopCardProps {
  stop: Stop;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onNavigate?: () => void;
}

const stopBgColors = [
  { bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
  { bg: "#EDE9FE", text: "#8B5CF6", dot: "#8B5CF6" },
  { bg: Colors.warningLight, text: Colors.warning, dot: Colors.warning },
];

export default function StopCard({
  stop,
  index,
  isActive,
  isCompleted,
  onNavigate,
}: StopCardProps) {
  const colorSet = stopBgColors[index % stopBgColors.length];

  return (
    <View
      style={[
        styles.container,
        isActive && styles.activeContainer,
        isCompleted && styles.completedContainer,
      ]}
    >
      <View style={styles.leftColumn}>
        <View
          style={[
            styles.indexDot,
            {
              backgroundColor: isCompleted
                ? Colors.success
                : isActive
                ? colorSet.dot
                : Colors.border,
            },
          ]}
        >
          {isCompleted ? (
            <Feather name="check" size={14} color={Colors.white} />
          ) : (
            <Text style={styles.indexText}>{index + 1}</Text>
          )}
        </View>
        {index < 2 && <View style={[styles.connector, isCompleted && styles.connectorActive]} />}
      </View>

      <View style={styles.content}>
        <View style={styles.typeRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isCompleted ? Colors.successLight : colorSet.bg },
            ]}
          >
            <Feather
              name={stop.type === "pickup" ? "package" : "home"}
              size={12}
              color={isCompleted ? Colors.success : colorSet.text}
            />
            <Text
              style={[
                styles.typeText,
                { color: isCompleted ? Colors.success : colorSet.text },
              ]}
            >
              {stop.type === "pickup" ? "Pickup" : "Deliver"}
            </Text>
          </View>
          {isActive && (
            <View style={styles.activeBadge}>
              <View style={styles.activeIndicator} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>

        <Text style={[styles.locationName, isCompleted && styles.completedText]}>
          {stop.locationName}
        </Text>
        <Text style={styles.address} numberOfLines={2}>
          {stop.address}
        </Text>

        {stop.items && stop.items.length > 0 && (
          <View style={styles.itemsContainer}>
            {stop.items.map((item, i) => (
              <Text key={i} style={styles.item}>
                • {item.quantity}x {item.name}
              </Text>
            ))}
          </View>
        )}

        {stop.instructions && (
          <View style={styles.instructionRow}>
            <Feather name="info" size={12} color={Colors.textSecondary} />
            <Text style={styles.instruction}>{stop.instructions}</Text>
          </View>
        )}

        {isActive && onNavigate && (
          <TouchableOpacity style={styles.navigateBtn} onPress={onNavigate}>
            <Feather name="navigation" size={14} color={Colors.primary} />
            <Text style={styles.navigateBtnText}>Navigate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    opacity: 0.7,
  },
  activeContainer: {
    opacity: 1,
  },
  completedContainer: {
    opacity: 0.5,
  },
  leftColumn: {
    alignItems: "center",
    width: 32,
  },
  indexDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  connectorActive: {
    backgroundColor: Colors.success,
  },
  content: {
    flex: 1,
    paddingBottom: 8,
    gap: 6,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  activeText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: "600",
  },
  locationName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  completedText: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
  address: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  itemsContainer: {
    gap: 2,
    marginTop: 2,
  },
  item: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 2,
  },
  instruction: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
    flex: 1,
  },
  navigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    alignSelf: "flex-start",
  },
  navigateBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
});
