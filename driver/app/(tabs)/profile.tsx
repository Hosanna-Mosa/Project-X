import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { ProfileHeader } from "@/components/ProfileHeader";
import { StatusCard } from "@/components/StatusCard";
import { VehicleCard } from "@/components/VehicleCard";
import { useDriverStore } from "@/store/driverStore";

const menuItems = [
  { icon: "👤", label: "Personal Info" },
  { icon: "📄", label: "Document Center" },
  { icon: "⚙️", label: "Settings" },
  { icon: "💬", label: "Support" },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <ProfileHeader
          name="Alex Driver"
          memberSince="Feb 2022"
          rating={4.9}
        />

        {/* Status Cards */}
        <View style={styles.statusRow}>
          <StatusCard title="Driving License" status="valid" />
          <View style={{ width: 10 }} />
          <StatusCard title="Vehicle Insurance" status="valid" />
        </View>

        {/* Current Vehicle */}
        <VehicleCard
          model="Toyota Prius"
          plate="882-WXZ"
          onPress={() => {}}
        />

        {/* Menu Items */}
        <View style={styles.menuCard}>
          {menuItems.map((item) => (
            <Pressable key={item.label} style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Sign Out */}
        <Pressable
          style={styles.signOutButton}
          onPress={() => {
            useDriverStore.getState().logout();
            router.replace("/auth");
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Dev: Retake Onboarding */}
        <Pressable
          style={styles.devButton}
          onPress={() => {
            useDriverStore.getState().resetOnboarding();
            router.replace("/onboarding");
          }}
        >
          <Text style={styles.devBadge}>DEV</Text>
          <Text style={styles.devButtonText}>Retake Onboarding</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  statusRow: {
    flexDirection: "row",
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 16,
  },
  menuLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  menuChevron: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  signOutButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.error,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.error,
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  devBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.surface,
    backgroundColor: Colors.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  devButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
});
