import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { ServiceToggle } from "@/components/ServiceToggle";
import { PerformanceCard } from "@/components/PerformanceCard";
import { ActiveTaskCard } from "@/components/ActiveTaskCard";
import { HighDemandAreas } from "@/components/HighDemandAreas";
import { GoOnlineModal } from "@/components/GoOnlineModal";
import IncomingOrderModal from "@/components/IncomingOrderModal";
import { useDriverStore } from "@/store/driverStore";
import { router } from "expo-router";

const mockHotspots = [
  { name: "Downtown Market", surge: "1.5x Surge" },
  { name: "Airport Terminal", surge: "1.3x Surge" },
  { name: "Riverside Mall", surge: "1.2x Surge" },
];

export default function HomeScreen() {
  const [mode, setMode] = useState<"ride" | "delivery">("ride");
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const isOnline = useDriverStore((s) => s.isOnline);
  const homeMode = useDriverStore((s) => s.homeMode);
  const activeServices = useDriverStore((s) => s.activeServices);
  const goOnline = useDriverStore((s) => s.goOnline);
  const goOffline = useDriverStore((s) => s.goOffline);
  const toggleHomeMode = useDriverStore((s) => s.toggleHomeMode);
  const currentOrder = useDriverStore((s) => s.currentOrder);

  const handleToggleOnline = () => {
    if (isOnline) {
      goOffline();
    } else {
      setShowOnlineModal(true);
    }
  };

  const handleGoOnline = (services: ("food" | "ride")[]) => {
    goOnline(services);
    setMode(services[0] === "food" ? "delivery" : "ride");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header with Online/Offline Toggle */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Afternoon</Text>
            <Text style={styles.subGreeting}>
              {isOnline ? "You're online and receiving orders" : "Ready to start earning"}
            </Text>
          </View>
          <Pressable
            style={[
              styles.onlineToggle,
              isOnline ? styles.onlineToggleActive : styles.onlineToggleInactive,
            ]}
            onPress={handleToggleOnline}
          >
            <View
              style={[
                styles.onlineToggleDot,
                isOnline ? styles.onlineDotActive : styles.onlineDotInactive,
              ]}
            />
            <Text
              style={[
                styles.onlineToggleText,
                isOnline ? styles.onlineToggleTextActive : styles.onlineToggleTextInactive,
              ]}
            >
              {isOnline ? "ONLINE" : "OFFLINE"}
            </Text>
          </Pressable>
        </View>

        {/* Online Status Banner */}
        <Pressable
          style={[
            styles.statusRow,
            isOnline && styles.statusRowOnline,
          ]}
          onPress={handleToggleOnline}
        >
          <Feather
            name={isOnline ? "wifi" : "wifi-off"}
            size={14}
            color={isOnline ? Colors.success : Colors.offline}
          />
          <Text style={[styles.statusText, isOnline && styles.statusTextOnline]}>
            {isOnline
              ? `Online for ${activeServices.join(" & ")}`
              : "You're offline — tap to go online"}
          </Text>
          <Feather
            name={isOnline ? "power" : "arrow-up-circle"}
            size={16}
            color={isOnline ? Colors.success : Colors.primary}
          />
        </Pressable>

        {/* Head Home Mode — visible only when online */}
        {isOnline && (
          <Pressable
            style={[
              styles.homeModeRow,
              homeMode && styles.homeModeRowActive,
            ]}
            onPress={toggleHomeMode}
          >
            <View style={styles.homeModeLeft}>
              <View style={[styles.homeModeIconWrap, homeMode && styles.homeModeIconWrapActive]}>
                <Feather
                  name="home"
                  size={18}
                  color={homeMode ? Colors.white : Colors.primary}
                />
              </View>
              <View style={styles.homeModeTextWrap}>
                <Text style={[styles.homeModeLabel, homeMode && styles.homeModeLabelActive]}>
                  Head Home
                </Text>
                <Text style={styles.homeModeDesc}>
                  {homeMode
                    ? "Getting orders toward your home"
                    : "Receive orders heading toward home"}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.homeModeSwitch,
                homeMode && styles.homeModeSwitchActive,
              ]}
            >
              <View
                style={[
                  styles.homeModeSwitchThumb,
                  homeMode && styles.homeModeSwitchThumbActive,
                ]}
              />
            </View>
          </Pressable>
        )}

        {/* Service Toggle */}
        <ServiceToggle active={mode} onToggle={setMode} />

        {/* Today's Performance */}
        <PerformanceCard
          stats={[
            { label: "Trips", value: "8" },
            { label: "Earnings", value: "₹124", accent: true },
            { label: "Hours", value: "5.2h" },
          ]}
        />

        {/* Active Tasks */}
        {currentOrder ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Tasks</Text>
            </View>
            <ActiveTaskCard
              mode={currentOrder.serviceType?.toLowerCase() === "helper" ? "delivery" : "ride"}
              time={currentOrder.timestamp ? new Date(currentOrder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just Now"}
              pickup={currentOrder.stops?.[0]?.address || currentOrder.stops?.[0]?.locationName || "Pickup Location"}
              dropoff={currentOrder.stops?.[currentOrder.stops.length - 1]?.address || currentOrder.stops?.[currentOrder.stops.length - 1]?.locationName || "Drop-off Location"}
              onGo={() => router.push("/active-order")}
            />
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Tasks</Text>
            </View>
            <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" }}>
              <Feather name="briefcase" size={24} color={Colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 4 }}>No Active Tasks</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "center" }}>
                {isOnline ? "You are online and ready to receive bookings. Keep the app open." : "Go online to receive and accept bookings."}
              </Text>
            </View>
          </>
        )}

        {/* High Demand Areas */}
        <View style={styles.sectionSpacing}>
          <HighDemandAreas
            hotspots={mockHotspots}
            onAreaPress={(area) => {
              // Future: Open Google Maps navigation to area
            }}
          />
        </View>

        {/* Safety Alerts */}
        <View style={styles.safetyAlert}>
          <Text style={styles.safetyIcon}>⚠️</Text>
          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>Safety Alert</Text>
            <Text style={styles.safetyText}>
              Road closure reported on Main St due to construction. Use alternate route.
            </Text>
          </View>
        </View>
      </ScrollView>

      <GoOnlineModal
        visible={showOnlineModal}
        onClose={() => setShowOnlineModal(false)}
        onGoOnline={handleGoOnline}
      />
      
      <IncomingOrderModal />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  subGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  onlineToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  onlineToggleActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  onlineToggleInactive: {
    backgroundColor: "#ffe6e6",
    borderColor: Colors.error,
  },
  onlineToggleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineDotActive: {
    backgroundColor: Colors.success,
  },
  onlineDotInactive: {
    backgroundColor: Colors.error,
  },
  onlineToggleText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  onlineToggleTextActive: {
    color: Colors.success,
  },
  onlineToggleTextInactive: {
    color: Colors.error,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusRowOnline: {
    backgroundColor: "#ebfaf0",
    borderColor: "#a8e6c1",
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  statusTextOnline: {
    color: Colors.success,
  },
  homeModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  homeModeRowActive: {
    backgroundColor: "#eefaff",
    borderColor: Colors.primary,
  },
  homeModeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  homeModeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  homeModeIconWrapActive: {
    backgroundColor: Colors.primary,
  },
  homeModeTextWrap: {
    flex: 1,
  },
  homeModeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  homeModeLabelActive: {
    color: Colors.primaryDark,
  },
  homeModeDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  homeModeSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  homeModeSwitchActive: {
    backgroundColor: Colors.primary,
  },
  homeModeSwitchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  homeModeSwitchThumbActive: {
    alignSelf: "flex-end",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.05,
  },
  sectionSpacing: {
    marginTop: 0,
  },
  safetyAlert: {
    flexDirection: "row",
    backgroundColor: "#fff8e6",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0c040",
    gap: 10,
  },
  safetyIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  safetyContent: {
    flex: 1,
  },
  safetyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 4,
  },
  safetyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
