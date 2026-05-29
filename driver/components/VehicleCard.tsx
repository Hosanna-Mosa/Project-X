import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
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
        <Feather name="truck" size={22} color={Colors.primary} />
      </View>
      <View style={styles.details}>
        <Text style={styles.label}>Current Vehicle</Text>
        <Text style={styles.vehicleText} numberOfLines={1}>
          {model} <Text style={styles.plate}>- {plate}</Text>
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textMuted} />
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
  details: {
    flex: 1,
    minWidth: 0,
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
});
