import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface CashOutButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function CashOutButton({ onPress, disabled = false, isLoading = false }: CashOutButtonProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <View style={styles.iconContainer}>
        <Feather name="dollar-sign" size={18} color={Colors.white} />
      </View>
      <Text style={styles.text}>Cash Out</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <Feather name="chevron-right" size={20} color={Colors.white} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.white,
    flex: 1,
  },
});
