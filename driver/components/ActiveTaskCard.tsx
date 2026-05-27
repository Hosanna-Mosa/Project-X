import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface ActiveTaskCardProps {
  mode: "ride" | "delivery";
  time: string;
  pickup: string;
  dropoff: string;
  onGo: () => void;
}

export function ActiveTaskCard({ mode, time, pickup, dropoff, onGo }: ActiveTaskCardProps) {
  const isRide = mode === "ride";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
          <View style={[styles.badge, isRide ? styles.badgeRide : styles.badgeDelivery]}>
          <Text style={[styles.badgeText, !isRide && styles.badgeTextDelivery]}>{isRide ? "Next Ride" : "Next Delivery"}</Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routeLine}>
          <View style={[styles.dot, styles.dotPickup]} />
          <View style={[styles.line, isRide ? styles.lineRide : styles.lineDelivery]} />
          <View style={[styles.dot, styles.dotDropoff]} />
        </View>
        <View style={styles.addresses}>
          <View style={styles.addressItem}>
            <Text style={styles.addressLabel}>Pickup</Text>
            <Text style={styles.addressText}>{pickup}</Text>
          </View>
          <View style={styles.addressItem}>
            <Text style={styles.addressLabel}>Drop-off</Text>
            <Text style={styles.addressText}>{dropoff}</Text>
          </View>
        </View>
      </View>

      <Pressable style={[styles.goButton, isRide ? styles.goButtonRide : styles.goButtonDelivery]} onPress={onGo}>
        <Text style={styles.goButtonText}>Go</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeRide: {
    backgroundColor: Colors.secondaryLight,
  },
  badgeDelivery: {
    backgroundColor: Colors.primaryLight,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.secondary,
  },
  badgeTextDelivery: {
    color: Colors.primaryDark,
  },
  time: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
  },
  route: {
    flexDirection: "row",
    marginBottom: 14,
  },
  routeLine: {
    alignItems: "center",
    width: 20,
    marginRight: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPickup: {
    backgroundColor: Colors.success,
  },
  dotDropoff: {
    backgroundColor: Colors.error,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  lineRide: {
    backgroundColor: Colors.success,
  },
  lineDelivery: {
    backgroundColor: Colors.error,
  },
  addresses: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  addressItem: {
    marginBottom: 12,
  },
  addressLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.05,
    marginBottom: 2,
  },
  addressText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  goButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  goButtonRide: {
    backgroundColor: Colors.secondary,
  },
  goButtonDelivery: {
    backgroundColor: Colors.primary,
  },
  goButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
});
