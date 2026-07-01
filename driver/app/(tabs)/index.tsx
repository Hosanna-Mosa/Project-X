import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { ServiceToggle } from "@/components/ServiceToggle";
import { PerformanceCard } from "@/components/PerformanceCard";
import { ActiveTaskCard } from "@/components/ActiveTaskCard";
import { HighDemandAreas, Hotspot } from "@/components/HighDemandAreas";
import { GoOnlineModal } from "@/components/GoOnlineModal";
import IncomingOrderModal from "@/components/IncomingOrderModal";
import { useDriverStore } from "@/store/driverStore";
import { router } from "expo-router";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

const fallbackHotspots: Hotspot[] = [
  {
    id: "fallback-kr-market",
    name: "KR Market",
    address: "KR Market, Huriopet, Chickpet, Bengaluru, Karnataka",
    lat: 12.9616,
    lng: 77.5769,
    surge: "1.5x Surge",
  },
  {
    id: "fallback-kempegowda-airport",
    name: "Kempegowda Airport",
    address: "Kempegowda International Airport, Devanahalli, Bengaluru, Karnataka",
    lat: 13.1986,
    lng: 77.7066,
    surge: "1.3x Surge",
  },
  {
    id: "fallback-orion-mall",
    name: "Orion Mall",
    address: "Orion Mall, Dr Rajkumar Road, Rajajinagar, Bengaluru, Karnataka",
    lat: 13.0112,
    lng: 77.5549,
    surge: "1.2x Surge",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"ride" | "delivery">("ride");
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [hotspots, setHotspots] = useState<Hotspot[]>(fallbackHotspots);
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false);
  const isOnline = useDriverStore((s) => s.isOnline);
  const homeMode = useDriverStore((s) => s.homeMode);
  const activeServices = useDriverStore((s) => s.activeServices);
  const goOnline = useDriverStore((s) => s.goOnline);
  const goOffline = useDriverStore((s) => s.goOffline);
  const identityVerified = useDriverStore((s) => s.identityVerified);
  const setIdentityVerified = useDriverStore((s) => s.setIdentityVerified);
  const toggleHomeMode = useDriverStore((s) => s.toggleHomeMode);
  const currentOrder = useDriverStore((s) => s.currentOrder);
  const token = useDriverStore((s) => s.token);
  const driverName = useDriverStore((s) => s.driverName);
  const earnings = useDriverStore((s) => s.earnings);
  const fetchEarnings = useDriverStore((s) => s.fetchEarnings);

  const [scheduledRides, setScheduledRides] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  const loadScheduledRides = useCallback(async () => {
    if (!apiUrl || !token) return;
    setLoadingScheduled(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/orders/driver/scheduled`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setScheduledRides(data);
      }
    } catch (error) {
      console.warn("Failed to load driver scheduled rides:", error);
    } finally {
      setLoadingScheduled(false);
    }
  }, [token]);

  useEffect(() => {
    loadScheduledRides();
    const interval = setInterval(loadScheduledRides, 30 * 1000);
    return () => clearInterval(interval);
  }, [loadScheduledRides]);

  // Fetch real earnings on mount and when token changes
  useEffect(() => {
    if (token) {
      fetchEarnings();
    }
  }, [token, fetchEarnings]);

  const loadHighDemandAreas = useCallback(async () => {
    if (!apiUrl || !token) {
      setHotspots(fallbackHotspots);
      return;
    }

    setIsLoadingHotspots(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/drivers/high-demand-areas?limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to load high demand areas");

      const areas = await response.json();
      if (Array.isArray(areas) && areas.length > 0) {
        setHotspots(areas);
      } else {
        setHotspots(fallbackHotspots);
      }
    } catch (error) {
      console.warn("High demand area fetch failed:", error);
      setHotspots(fallbackHotspots);
    } finally {
      setIsLoadingHotspots(false);
    }
  }, [token]);

  useEffect(() => {
    loadHighDemandAreas();
    const interval = setInterval(loadHighDemandAreas, 60 * 1000);

    return () => clearInterval(interval);
  }, [loadHighDemandAreas]);

  const openDemandAreaInMaps = async (area: Hotspot) => {
    const query = encodeURIComponent(
      Number.isFinite(area.lat) && Number.isFinite(area.lng)
        ? `${area.lat},${area.lng}`
        : area.address,
    );
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("Google Maps link is not supported");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open maps", "Please try again from this device.");
    }
  };

  const handleToggleOnline = () => {
    if (isOnline) {
      goOffline();
      return;
    }

    // Check identity verification before allowing go-online
    if (!identityVerified) {
      Alert.alert(
        "Identity Verification Required",
        "To start receiving orders, you must verify at least one government ID (Aadhaar or PAN Card).",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Verify Now",
            onPress: () => router.push("/identity-verify"),
          },
        ]
      );
      return;
    }

    setShowOnlineModal(true);
  };

  // Load identity status from profile on mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/drivers/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.verification?.identity != null) {
          setIdentityVerified(data.verification.identity);
        }
      } catch {
        // silently ignore — store defaults to false
      }
    })();
  }, [token]);

  const handleGoOnline = (services: ("food" | "ride")[]) => {
    goOnline(services);
    setMode(services[0] === "food" ? "delivery" : "ride");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
      >
        {/* Header with Online/Offline Toggle */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>
              {(() => {
                const h = new Date().getHours();
                if (h < 12) return `Good Morning${driverName ? `, ${driverName.split(' ')[0]}` : ''}!`;
                if (h < 17) return `Good Afternoon${driverName ? `, ${driverName.split(' ')[0]}` : ''}!`;
                return `Good Evening${driverName ? `, ${driverName.split(' ')[0]}` : ''}!`;
              })()}
            </Text>
            <Text style={styles.subGreeting} numberOfLines={1}>
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
            { label: "Trips", value: String(earnings.totalDeliveries) },
            { label: "Balance", value: `₹${earnings.today}`, accent: true },
            { label: "This Week", value: `₹${earnings.week}` },
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

        {/* Scheduled Rides Section */}
        {scheduledRides.length > 0 && (
          <View style={styles.sectionSpacing}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scheduled Rides ({scheduledRides.length})</Text>
            </View>
            <View style={{ gap: 12, marginTop: 8 }}>
              {scheduledRides.map((ride) => {
                const pickup = ride.stops?.[0]?.address || "Pickup Location";
                const drop = ride.stops?.[ride.stops.length - 1]?.address || "Drop Location";
                const dateStr = ride.reservedAt ? new Date(ride.reservedAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "N/A";
                
                return (
                  <View key={ride._id} style={styles.scheduledCard}>
                    <View style={styles.scheduledHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Feather name="calendar" size={16} color={Colors.primary} />
                        <Text style={styles.scheduledTime}>{dateStr}</Text>
                      </View>
                      <Text style={styles.scheduledPrice}>₹{Math.round(ride.totalPrice * 0.8)}</Text>
                    </View>
                    
                    <View style={styles.scheduledBody}>
                      <View style={styles.addressLine}>
                        <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                        <Text style={styles.addressText} numberOfLines={1}>{pickup}</Text>
                      </View>
                      <View style={styles.connectorLine} />
                      <View style={styles.addressLine}>
                        <View style={[styles.dot, { backgroundColor: Colors.error }]} />
                        <Text style={styles.addressText} numberOfLines={1}>{drop}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.scheduledFooter}>
                      <View>
                        <Text style={styles.customerName}>Rider: {ride.user?.name || "Customer"}</Text>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{ride.serviceType?.toUpperCase()}</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.startRideBtn, currentOrder && { opacity: 0.5 }]}
                        disabled={!!currentOrder}
                        onPress={() => {
                          const { startReservedRide } = useDriverStore.getState();
                          startReservedRide(ride._id);
                        }}
                      >
                        <Text style={styles.startRideBtnText}>Start Ride</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* High Demand Areas */}
        <View style={styles.sectionSpacing}>
          <HighDemandAreas
            hotspots={hotspots}
            isLoading={isLoadingHotspots}
            onAreaPress={openDemandAreaInMaps}
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
    gap: 16,
  },
  startRideBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startRideBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
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
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    width: 116,
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
  scheduledCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scheduledHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  scheduledTime: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  scheduledPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.success,
  },
  scheduledBody: {
    gap: 8,
    marginBottom: 10,
  },
  addressLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addressText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  connectorLine: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginLeft: 3.5,
    marginTop: -6,
    marginBottom: -6,
  },
  scheduledFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: 10,
  },
  customerName: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.primaryDark,
  },
});
