import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface ServiceToggleProps {
  active: "ride" | "delivery";
  onToggle: (mode: "ride" | "delivery") => void;
}

export function ServiceToggle({ active, onToggle }: ServiceToggleProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.option, active === "ride" ? styles.optionActive : styles.optionInactive]}
        onPress={() => onToggle("ride")}
      >
        <MaterialCommunityIcons 
          name="moped" 
          size={18} 
          color={active === "ride" ? Colors.white : Colors.primary} 
          style={{ marginRight: 8 }} 
        />
        <Text style={[styles.optionText, active === "ride" && styles.optionTextActive]}>
          Ride
        </Text>
      </Pressable>
      
      <Pressable
        style={[styles.option, active === "delivery" ? styles.optionActive : styles.optionInactive]}
        onPress={() => onToggle("delivery")}
      >
        <Feather 
          name="shopping-bag" 
          size={16} 
          color={active === "delivery" ? Colors.white : Colors.primary} 
          style={{ marginRight: 8 }} 
        />
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
    gap: 12,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  optionActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  optionInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
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
