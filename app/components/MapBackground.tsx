import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  children?: React.ReactNode;
  style?: object;
}

export function MapBackground({ children, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapContainer}>
        <Image
          source={require("@/assets/images/map-bg.png")}
          style={styles.mapImage}
          resizeMode="cover"
        />
        <View style={styles.mapOverlay} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
});
