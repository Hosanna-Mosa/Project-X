import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface StatusCardProps {
  title: string;
  status: "valid" | "expired" | "pending";
}

export function StatusCard({ title, status }: StatusCardProps) {
  const isValid = status === "valid";

  return (
    <View style={[styles.card, isValid && styles.cardValid]}>
      <View style={[styles.iconCircle, isValid && styles.iconCircleValid]}>
        <Text style={styles.checkmark}>✓</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.statusBadge, isValid ? styles.statusValid : styles.statusInvalid]}>
        <Text style={[styles.statusText, isValid ? styles.statusTextValid : styles.statusTextInvalid]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardValid: {
    borderColor: Colors.success + "40",
    backgroundColor: Colors.tertiaryLight,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconCircleValid: {
    backgroundColor: Colors.success + "20",
  },
  checkmark: {
    fontSize: 18,
    color: Colors.success,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusValid: {
    backgroundColor: Colors.success + "20",
  },
  statusInvalid: {
    backgroundColor: Colors.errorLight,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  statusTextValid: {
    color: Colors.success,
  },
  statusTextInvalid: {
    color: Colors.error,
  },
});
