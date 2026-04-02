import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { MapBackground } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";

export default function ServiceSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { label } = useLocalSearchParams<{ label: string }>();
  const [searchText, setSearchText] = useState("");

  return (
    <View style={styles.root}>
      {/* Real map would go here, currently using the placeholder MapBackground */}
      <MapBackground style={StyleSheet.absoluteFill} />

      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{label || "Select Location"}</Text>
        </View>
      </View>

      {/* Map Content Overlay (Optional Pin in Center) */}
      <View style={styles.pinContainer} pointerEvents="none">
        <View style={styles.pinShadow} />
        <View style={styles.pin}>
          <View style={styles.pinInner} />
        </View>
      </View>

      {/* Bottom Sheet with Search Bar */}
      <BottomSheet style={styles.bottomSheet}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Where to?</Text>
          <Text style={styles.sheetSubtitle}>
            Search for a location to start your {label?.toLowerCase()} delivery
          </Text>

          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={Colors.light.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street name..."
              placeholderTextColor={Colors.light.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          </View>

          {/* Location Suggestions (Mock) */}
          <View style={styles.suggestions}>
            <TouchableOpacity style={styles.suggestionItem}>
              <View style={styles.suggestionIconBox}>
                <Feather name="map-pin" size={18} color={Colors.light.textSecondary} />
              </View>
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionTitle}>Set location on map</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            <View style={styles.divider} />

            <TouchableOpacity style={styles.suggestionItem}>
              <View style={[styles.suggestionIconBox, { backgroundColor: '#F0F9FF' }]}>
                <Feather name="home" size={18} color="#0EA5E9" />
              </View>
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionTitle}>Home</Text>
                <Text style={styles.suggestionSubtitle}>221B Baker Street, London</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  pinContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40, // Adjust for bottom sheet offset
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 12,
  },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  pinShadow: {
    width: 8,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 4,
    position: "absolute",
    bottom: -2,
    transform: [{ scaleX: 2 }],
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 320,
    paddingBottom: 40,
  },
  sheetContent: {
    gap: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.light.text,
    letterSpacing: -1,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: "500",
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  suggestions: {
    marginTop: 8,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  suggestionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  suggestionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 54,
  },
});
