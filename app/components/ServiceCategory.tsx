import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
}

export function ServiceCategory({
  icon,
  label,
  onPress,
  color = Colors.light.primary,
  backgroundColor = Colors.light.surface,
}: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconBox, { backgroundColor }]}>
        <FontAwesome5 name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
  },
});
