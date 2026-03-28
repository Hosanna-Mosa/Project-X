import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import { Colors } from "@/constants/colors";
import { Stop } from "@/store/driverStore";

interface MapViewProps {
  stops?: Stop[];
  currentStep?: number;
  style?: object;
}

const stopColors = [Colors.stop1, Colors.stop2, Colors.stop3, Colors.primary];

export default function MapViewComponent({ stops = [], currentStep = 0, style }: MapViewProps) {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.webMapContainer, style]}>
        <View style={styles.webMapContent}>
          <Text style={styles.webMapIcon}>🗺</Text>
          <Text style={styles.webMapText}>Map View</Text>
          <Text style={styles.webMapSubtext}>Live navigation available on device</Text>
        </View>
        {stops.length > 0 && (
          <View style={styles.stopsOverlay}>
            {stops.map((stop, idx) => (
              <View
                key={stop.id}
                style={[
                  styles.stopDot,
                  {
                    backgroundColor: stopColors[idx % stopColors.length],
                    opacity: idx === currentStep ? 1 : 0.6,
                    transform: [{ scale: idx === currentStep ? 1.2 : 1 }],
                    left: 20 + idx * 80,
                    top: 60 + (idx % 2) * 40,
                  },
                ]}
              >
                <Text style={styles.stopDotText}>{idx + 1}</Text>
              </View>
            ))}
            {stops.length > 1 && (
              <View style={styles.routeLine} />
            )}
          </View>
        )}
        <View style={styles.driverDot}>
          <Text style={styles.driverDotText}>📍</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.nativeMapContainer, style]}>
      <Text style={styles.nativeMapText}>Map loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webMapContainer: {
    backgroundColor: "#E8F4FD",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    minHeight: 200,
  },
  webMapContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  webMapIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  webMapText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  webMapSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stopsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stopDot: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopDotText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  routeLine: {
    position: "absolute",
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.5,
    left: 36,
    right: 36,
    top: 76,
  },
  driverDot: {
    position: "absolute",
    bottom: 20,
    left: "50%",
  },
  driverDotText: {
    fontSize: 24,
  },
  nativeMapContainer: {
    backgroundColor: "#E8F4FD",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  nativeMapText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
