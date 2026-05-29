import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface StatusCardProps {
  title: string;
  status: "valid" | "expired" | "pending";
}

export function StatusCard({ title, status }: StatusCardProps) {
  const isValid = status === "valid";
  const isPending = status === "pending";

  return (
    <View style={[styles.card, isValid && styles.cardValid]}>
      <View style={[styles.iconCircle, isValid && styles.iconCircleValid]}>
        <Feather
          name={isValid ? "check" : isPending ? "clock" : "x"}
          size={18}
          color={isValid ? Colors.success : isPending ? Colors.warning : Colors.error}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.statusBadge, isValid ? styles.statusValid : isPending ? styles.statusPending : styles.statusInvalid]}>
        <Text style={[styles.statusText, isValid ? styles.statusTextValid : isPending ? styles.statusTextPending : styles.statusTextInvalid]}>
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
  statusPending: {
    backgroundColor: Colors.warning + "20",
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
  statusTextPending: {
    color: Colors.warning,
  },
  statusTextInvalid: {
    color: Colors.error,
  },
});
