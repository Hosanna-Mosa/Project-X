import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface VehicleCardProps {
  model: string;
  plate: string;
  onPress?: () => void;
}

export function VehicleCard({ model, plate, onPress }: VehicleCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Text style={styles.carIcon}>🚗</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.label}>Current Vehicle</Text>
        <Text style={styles.vehicleText}>
          {model} <Text style={styles.plate}>• {plate}</Text>
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  carIcon: {
    fontSize: 22,
  },
  details: {
    flex: 1,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  vehicleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  plate: {
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
    marginLeft: 8,
  },
});
