import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export interface Hotspot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  surge: string;
  orderCount?: number;
}

interface HighDemandAreasProps {
  hotspots: Hotspot[];
  isLoading?: boolean;
  onAreaPress?: (area: Hotspot) => void;
}

export function HighDemandAreas({ hotspots, isLoading = false, onAreaPress }: HighDemandAreasProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>High Demand Areas</Text>
      <View style={styles.hotspotList}>
        {isLoading && (
          <View style={styles.loadingItem}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
        {hotspots.map((spot) => (
          <Pressable
            key={spot.id}
            style={styles.hotspotItem}
            onPress={() => onAreaPress?.(spot)}
          >
            <View style={styles.hotspotDot} />
            <View style={styles.hotspotCopy}>
              <Text style={styles.hotspotName} numberOfLines={1}>
                {spot.name}
              </Text>
              <Text style={styles.hotspotAddress} numberOfLines={1}>
                {spot.address}
              </Text>
            </View>
            <View style={styles.surgeChip}>
              <Text style={styles.surgeChipText}>{spot.surge}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.05,
    marginBottom: 10,
  },
  hotspotList: {
    gap: 8,
  },
  hotspotItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hotspotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surge,
  },
  hotspotName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  hotspotCopy: {
    flex: 1,
    minWidth: 0,
  },
  hotspotAddress: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  surgeChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  surgeChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  loadingItem: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingVertical: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
