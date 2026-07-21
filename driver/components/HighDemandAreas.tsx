import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>High Demand Areas</Text>
        <TouchableOpacity style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>View all</Text>
          <Feather name="chevron-right" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>
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
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="map-marker" size={16} color={Colors.primary} />
              </View>
            </View>
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
            <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  hotspotList: {
    gap: 12,
  },
  hotspotItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eefaff',
    alignItems: "center",
    justifyContent: "center",
  },
  hotspotName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  hotspotCopy: {
    flex: 1,
    minWidth: 0,
  },
  hotspotAddress: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  surgeChip: {
    backgroundColor: '#eefaff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d2ebff',
    marginRight: 4,
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
