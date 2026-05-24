import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Hotspot {
  name: string;
  surge: string;
}

interface HighDemandAreasProps {
  hotspots: Hotspot[];
  onAreaPress?: (area: Hotspot) => void;
}

export function HighDemandAreas({ hotspots, onAreaPress }: HighDemandAreasProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>High Demand Areas</Text>
      <View style={styles.hotspotList}>
        {hotspots.map((spot) => (
          <Pressable
            key={spot.name}
            style={styles.hotspotItem}
            onPress={() => onAreaPress?.(spot)}
          >
            <View style={styles.hotspotDot} />
            <Text style={styles.hotspotName}>{spot.name}</Text>
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
    flex: 1,
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
});
