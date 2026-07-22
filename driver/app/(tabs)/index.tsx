import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, TouchableOpacity, Image, Animated, Easing, Dimensions } from "react-native";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
  const overlapMargin = (SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT <= 850) ? 0 : -46;
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

  const translateX = React.useRef(new Animated.Value(0)).current;

  // Drive Animation when going online
  useEffect(() => {
    if (isOnline) {
      Animated.sequence([
        // Drive off screen to the right
        Animated.timing(translateX, {
          toValue: 200, 
          duration: 500,
          easing: Easing.in(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        // Instantly move off-screen left
        Animated.timing(translateX, {
          toValue: -300,
          duration: 0,
          useNativeDriver: true,
        }),
        // Drive in from left to original position
        Animated.timing(translateX, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isOnline, translateX]);

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
      Alert.alert(
        "Go Offline",
        "Are you sure you want to go offline? You will stop receiving new requests.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go Offline", style: "destructive", onPress: () => goOffline() }
        ]
      );
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
    <View style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
        bounces={false}
      >
        {/* Header with Online/Offline Toggle */}
        <LinearGradient
          colors={['#60a5fa', '#3b82f6']}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <Image 
            source={require('../../assets/images/cityscape_bg.png')} 
            style={styles.headerBgImage} 
            resizeMode="cover" 
          />
          
          <View style={styles.headerContent}>
            {/* Top Row: Greeting */}
            <View style={styles.headerTopRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.greeting}>
                  {(() => {
                    const h = new Date().getHours();
                    if (h < 12) return `Good Morning${driverName ? `, ${driverName.split(' ')[0]}` : ''}!`;
                    if (h < 17) return `Good Afternoon${driverName ? `, ${driverName.split(' ')[0]}` : ''}!`;
                    return `Good Evening${driverName ? `, ${driverName.split(' ')[0]}` : ''}!`;
                  })()} 👋
                </Text>
                <Text style={styles.subGreeting} numberOfLines={1}>
                  {isOnline ? "You're online and receiving orders" : "Ready to start earning"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
            <View style={{ position: 'relative', zIndex: 10, marginTop: overlapMargin, marginBottom: 8 }}>
              {/* Online Status Banner (Overlapping) */}
              <Pressable
                style={styles.statusCard}
                onPress={handleToggleOnline}
              >
              <View style={[styles.statusIconBg, { backgroundColor: isOnline ? '#e6faec' : '#f1f5f9' }]}>
                <Feather
                  name={isOnline ? "wifi" : "wifi-off"}
                  size={20}
                  color={isOnline ? Colors.success : Colors.textMuted}
                />
              </View>
              <View style={styles.statusCardCopy}>
                <Text style={styles.statusCardTitle}>
                  {isOnline ? `Online for ${activeServices.join(" & ").toLowerCase()}` : "You're Offline"}
                </Text>
                <Text style={styles.statusCardDesc}>
                  {isOnline ? "You're visible to customers" : "Tap to go online"}
                </Text>
              </View>
              <View style={[
                styles.powerButton, 
                { backgroundColor: isOnline ? '#22C55E' : '#EF4444', borderWidth: 0 }
              ]}>
                <Feather
                  name="power"
                  size={24}
                  color="#ffffff"
                />
              </View>
            </Pressable>
            {/* Illustration */}
            <Animated.Image 
              source={require('../../assets/images/generated_blue_scooter.png')} 
              style={[styles.heroIllustration, { transform: [{ translateX }] }]}
              resizeMode="contain"
            />
            <Animated.View style={[styles.onlineBadgeHero, { transform: [{ translateX }] }]}>
              <View style={[styles.onlineBadgeDot, !isOnline && { backgroundColor: Colors.textMuted }]} />
              <Text style={[styles.onlineBadgeText, !isOnline && { color: Colors.textMuted }]}>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </Text>
            </Animated.View>
          </View>

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
                  color={homeMode ? Colors.white : "#0ea5e9"}
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
            <View style={styles.emptyTasksCard}>
              <Image 
                source={require('../../assets/images/clipboard_empty_state.png')} 
                style={styles.emptyTasksImg}
                resizeMode="contain"
              />
              <View style={styles.emptyTasksCopy}>
                <Text style={styles.emptyTasksTitle}>No Active Tasks</Text>
                <Text style={styles.emptyTasksDesc}>
                  {isOnline ? "You are online and ready\nto receive bookings.\nKeep the app open." : "Go online to receive\nand accept bookings."}
                </Text>
              </View>
              <TouchableOpacity style={styles.calendarBtn}>
                <Feather name="calendar" size={18} color={Colors.primary} />
              </TouchableOpacity>
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
          <Feather name="alert-triangle" size={moderateScale(24)} color="#f59e0b" style={{ marginTop: 2 }} />
          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>Safety Alert</Text>
            <Text style={styles.safetyText}>
              Road closure reported on Main St due to construction. Use alternate route.
            </Text>
          </View>
          <Image 
            source={require('../../assets/images/safety_cones.png')} 
            style={styles.safetyImg}
            resizeMode="contain"
          />
        </View>
      </View>
      </ScrollView>

      <GoOnlineModal
        visible={showOnlineModal}
        onClose={() => setShowOnlineModal(false)}
        onGoOnline={handleGoOnline}
      />
      
      <IncomingOrderModal />
    </View>
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
    borderRadius: moderateScale(20),
  },
  startRideBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(14),
  },
  headerGradient: {
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),
    overflow: 'hidden',
    position: 'relative',
  },
  headerBgImage: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 140,
    opacity: 0.15,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 2,
  },
  menuButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontFamily: "Inter_700Bold",
    fontSize: moderateScale(20),
    color: '#fff',
  },
  subGreeting: {
    fontFamily: "Inter_500Medium",
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  heroIllustration: {
    position: 'absolute',
    right: 16,
    top: -85,
    width: 100,
    height: 100,
    zIndex: 10,
  },
  onlineBadgeHero: {
    position: 'absolute',
    right: 14,
    top: -96,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: moderateScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 11,
  },
  onlineBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.success,
  },
  onlineBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(9),
    color: Colors.success,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(16),
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 0,
    marginBottom: 0,
    zIndex: 5,
  },
  statusIconBg: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusCardCopy: {
    flex: 1,
  },
  statusCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(15),
    color: Colors.text,
    marginBottom: 2,
  },
  statusCardDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  powerButton: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerButtonOnline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  homeModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(14),
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
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(10),
    backgroundColor: '#e0f2fe',
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
    fontSize: moderateScale(14),
    color: Colors.text,
    marginBottom: 2,
  },
  homeModeLabelActive: {
    color: Colors.primaryDark,
  },
  homeModeDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  homeModeSwitch: {
    width: moderateScale(44),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: Colors.border,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  homeModeSwitchActive: {
    backgroundColor: Colors.primary,
  },
  homeModeSwitchThumb: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
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
    fontFamily: "Inter_700Bold",
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  sectionSpacing: {
    marginTop: 4,
  },
  emptyTasksCard: {
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(16),
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTasksImg: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  emptyTasksCopy: {
    flex: 1,
  },
  emptyTasksTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: moderateScale(15),
    color: Colors.text,
    marginBottom: 4,
  },
  emptyTasksDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  calendarBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  safetyAlert: {
    flexDirection: "row",
    backgroundColor: "#fff5e6",
    borderRadius: moderateScale(16),
    padding: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  safetyContent: {
    flex: 1,
    marginRight: 60,
  },
  safetyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: moderateScale(15),
    color: '#92400e',
    marginBottom: 4,
  },
  safetyText: {
    fontFamily: "Inter_500Medium",
    fontSize: moderateScale(12),
    color: '#b45309',
    lineHeight: 18,
  },
  safetyImg: {
    width: 80,
    height: 80,
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  scheduledCard: {
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(14),
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
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  scheduledPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: moderateScale(15),
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
    fontSize: moderateScale(13),
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
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: moderateScale(6),
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: moderateScale(10),
    color: Colors.primaryDark,
  },
});
