import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { DeliveryStop } from "@/contexts/deliveryStore";

interface Props {
  stop: DeliveryStop;
  index: number;
  onRemove: (id: string) => void;
  onPress?: (stop: DeliveryStop) => void;
}

export function StopCard({ stop, index, onRemove, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(stop)}
      activeOpacity={0.8}
    >
      <View style={styles.stopIndicator}>
        <View style={styles.dot}>
          <Text style={styles.dotText}>{index + 1}</Text>
        </View>
        <View style={styles.line} />
      </View>
      <View style={styles.content}>
        {stop.storeName && (
          <Text style={styles.storeName}>{stop.storeName}</Text>
        )}
        <Text style={styles.address} numberOfLines={1}>
          {stop.address}
        </Text>
        {stop.items && stop.items.length > 0 && (
          <Text style={styles.itemCount}>
            {stop.items.length} item{stop.items.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(stop.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={16} color={Colors.light.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stopIndicator: {
    alignItems: "center",
    marginRight: 12,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  line: {
    width: 2,
    height: 16,
    backgroundColor: Colors.light.primaryLight,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 4,
    fontWeight: "500",
  },
  removeBtn: {
    padding: 4,
  },
});
