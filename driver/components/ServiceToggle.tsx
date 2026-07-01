import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface ServiceToggleProps {
  active: "ride" | "delivery";
  onToggle: (mode: "ride" | "delivery") => void;
}

export function ServiceToggle({ active, onToggle }: ServiceToggleProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.option, active === "ride" && styles.optionActive]}
        onPress={() => onToggle("ride")}
      >
        <Text style={[styles.optionText, active === "ride" && styles.optionTextActive]}>
          Ride
        </Text>
      </Pressable>
      <Pressable
        style={[styles.option, active === "delivery" && styles.optionActive]}
        onPress={() => onToggle("delivery")}
      >
        <Text style={[styles.optionText, active === "delivery" && styles.optionTextActive]}>
          Delivery
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 3,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  optionActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionTextActive: {
    color: Colors.white,
  },
});
