import React, { useEffect, useState, useRef } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useThemeStore } from "@/contexts/themeStore";
import Colors from "@/constants/colors";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";
import { customFetch } from "@/utils/api/custom-fetch";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { socketService } from "@/utils/socketService";
import { useDeliveryStore } from "@/contexts/deliveryStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ServiceSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { label } = useLocalSearchParams<{ label: string }>();
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [searchText, setSearchText] = useState("");
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapBackgroundRef>(null);
  const { setOrderId: setGlobalOrderId, setDriver: setGlobalDriver, setStatus: setGlobalStatus, unreadCount } = useDeliveryStore();

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  // "Hours book" specific state
  const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [durationOption, setDurationOption] = useState<string>("1");
  const [customDuration, setCustomDuration] = useState<string>("");
  const [radiusOption, setRadiusOption] = useState<string>("2");
  const [customRadius, setCustomRadius] = useState<string>("");
  const [bookingState, setBookingState] = useState<"idle" | "booking" | "success">("idle");
  const [searchingStatus, setSearchingStatus] = useState<string>("Initializing booking...");
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  
  // Staggered animated values for radar pulses
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  // Fetch current GPS location on mount if label is "Task"
  useEffect(() => {
    if (label === "Task") {
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const currentCoords = { lat: location.coords.latitude, lng: location.coords.longitude };
          setCoords(currentCoords);
          
          const [place] = await Location.reverseGeocodeAsync({
            latitude: currentCoords.lat,
            longitude: currentCoords.lng,
          });
          if (place) {
            const addressStr = `${place.name || place.streetNumber || ""} ${place.street || ""}, ${place.city || ""}, ${place.region || ""} ${place.postalCode || ""}`.trim();
            setSelectedAddress({
              addressLine: addressStr || "Current Location",
              coordinates: currentCoords,
              label: "Current Location",
            });
          }
        } catch (error) {
          console.error("Error fetching current location in Task:", error);
        }
      })();
    }
  }, [label]);

  // Handle booking status updates and pulse animations
  useEffect(() => {
    let statusTimer: any;
    if (bookingState === "booking") {
      const statuses = [
        "Analyzing helper availability...",
        "Checking distance radius...",
        "Locating closest captains...",
        "Almost matched, finalizing booking...",
      ];
      let i = 0;
      setSearchingStatus(statuses[0]);
      statusTimer = setInterval(() => {
        i++;
        if (i < statuses.length) {
          setSearchingStatus(statuses[i]);
        }
      }, 1000);
      
      const selectedCoords = getSelectedCoords();
      if (selectedCoords) {
        setTimeout(() => {
          mapRef.current?.panTo(selectedCoords.lat, selectedCoords.lng, 0.015);
        }, 50);
      }

      pulse1.setValue(0);
      pulse2.setValue(0);
      pulse3.setValue(0);

      Animated.loop(
        Animated.parallel([
          Animated.timing(pulse1, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.sequence([ Animated.delay(400), Animated.timing(pulse2, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }) ]),
          Animated.sequence([ Animated.delay(800), Animated.timing(pulse3, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }) ])
        ])
      ).start();

      return () => {
        clearInterval(statusTimer);
      };
    }
  }, [bookingState, selectedAddress]);

  useEffect(() => {
    if (currentOrderId && bookingState === "booking") {
      socketService.connect();
      socketService.trackOrder(currentOrderId);

      const handleOrderAccepted = (data: any) => {
        if (data.orderId === currentOrderId) {
          setBookingState("success");
          setDriverInfo(data.driver);
          
          // Hydrate global store for tracking and chat
          setGlobalOrderId(data.orderId);
          setGlobalDriver(data.driver);
          setGlobalStatus("driver_assigned");

          const selectedCoords = getSelectedCoords();
          if (selectedCoords) {
            const mockDriver = {
              lat: selectedCoords.lat + 0.003,
              lng: selectedCoords.lng - 0.002,
            };
            setDriverLocation(mockDriver);
            setTimeout(() => {
              mapRef.current?.panTo(mockDriver.lat, mockDriver.lng, 0.015);
            }, 100);
          }
        }
      };

      socketService.on("order_accepted", handleOrderAccepted);
      return () => {
        socketService.off("order_accepted", handleOrderAccepted);
      };
    }
  }, [currentOrderId, bookingState]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Initialize countdown when success occurs
  useEffect(() => {
    if (bookingState === "success") {
      const hours = durationOption === "custom" 
        ? parseFloat(customDuration) || 1 
        : parseFloat(durationOption) || 1;
      setSecondsRemaining(Math.round(hours * 3600));
    }
  }, [bookingState, durationOption, customDuration]);

  // Handle countdown interval
  useEffect(() => {
    let interval: any = null;
    if (bookingState === "success" && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [bookingState, secondsRemaining]);

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    const hStr = h.toString().padStart(2, "0");
    const mStr = m.toString().padStart(2, "0");
    const sStr = s.toString().padStart(2, "0");
    
    return `${hStr}:${mStr}:${sStr}`;
  };

  const handleBook = async () => {
    if (!selectedAddress) {
      Alert.alert("Location required", "Please select a location address for booking.");
      return;
    }
    setBookingState("booking");
    try {
      const selectedCoords = getSelectedCoords();
      const orderStops = [
        { address: selectedAddress.label || selectedAddress.addressLine || "Location", latitude: selectedCoords?.lat, longitude: selectedCoords?.lng, type: "pickup" }
      ];
      const fare = calculateFareDetails();
      const res = await customFetch<{ _id: string }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          stops: orderStops,
          serviceType: "helper",
          totals: { total: fare.total, subtotal: fare.baseFare },
          radius: fare.radius,
          duration: fare.hours,
        })
      });
      setCurrentOrderId(res._id);
    } catch (e: any) {
      Alert.alert("Booking Failed", e.message);
      setBookingState("idle");
    }
  };

  const handleCancelBooking = () => {
    setBookingState("idle");
    setDriverLocation(null);
    setCurrentOrderId(null);
  };

  const handleReset = () => {
    setBookingState("idle");
    setDriverLocation(null);
    setCurrentOrderId(null);
  };

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        setLoading(true);
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const currentCoords = { lat: location.coords.latitude, lng: location.coords.longitude };
        setCoords(currentCoords);

        if (["Food", "Grocery", "Meds"].includes(label as string)) {
          let keyword = "food";
          if (label === "Grocery") keyword = "grocery supermarket";
          if (label === "Meds") keyword = "pharmacy medical shop";
          
          fetchNearby(currentCoords.lat, currentCoords.lng, keyword);
        }
      } catch (err) {
        console.error("Location/Fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [label]);

  const fetchNearby = async (lat: number, lng: number, keyword: string) => {
    try {
      const data = await customFetch<any[]>(`/api/v1/places/nearby?lat=${lat}&lng=${lng}&radius=5000&keyword=${encodeURIComponent(keyword)}`);
      setNearbyPlaces(data);
      if (data.length > 0) {
        setTimeout(() => mapRef.current?.fitToMarkers(data), 1000);
      }
    } catch (err) {
      console.error("Fetch nearby error:", err);
    }
  };

  const getSelectedCoords = () => {
    if (!selectedAddress) return null;
    if (selectedAddress.coordinates) return selectedAddress.coordinates;
    if (selectedAddress.location?.coordinates) {
      return {
        lng: selectedAddress.location.coordinates[0],
        lat: selectedAddress.location.coordinates[1],
      };
    }
    return null;
  };

  const calculateFareDetails = () => {
    const hours = durationOption === "custom" 
      ? parseFloat(customDuration) || 1 
      : parseFloat(durationOption) || 1;
      
    const radius = radiusOption === "custom" 
      ? parseFloat(customRadius) || 2 
      : parseFloat(radiusOption) || 2;

    const baseFare = 99;
    const hourlyRate = 120;
    const durationCharge = Math.round(hours * hourlyRate);
    
    let radiusCharge = 0;
    if (radius <= 2) {
      radiusCharge = 0;
    } else if (radius <= 5) {
      radiusCharge = 29;
    } else if (radius <= 10) {
      radiusCharge = 59;
    } else if (radius <= 15) {
      radiusCharge = 89;
    } else {
      radiusCharge = Math.round(radius * 8);
    }
    
    const platformFee = 15;
    const subtotal = baseFare + durationCharge + radiusCharge + platformFee;
    const taxes = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal + taxes;

    return {
      baseFare,
      durationCharge,
      hours,
      radius,
      radiusCharge,
      platformFee,
      taxes,
      total,
    };
  };

  const handleMarkerPress = (place: any) => {
    setSelectedPlace(place);
    mapRef.current?.panTo(place.lat, place.lng, 0.005);
  };

  if (label === "Task") {
    const finalDuration = durationOption === "custom" ? customDuration || "Custom" : durationOption;
    const finalRadius = radiusOption === "custom" ? customRadius || "Custom" : radiusOption;
    const selectedCoords = getSelectedCoords();
    const fareDetails = calculateFareDetails();

    return (
      <View style={styles.root}>
        {/* Background Map - visible in booking and success states */}
        {bookingState !== "idle" && (
          <View style={StyleSheet.absoluteFill}>
            <MapBackground 
              ref={mapRef}
              style={StyleSheet.absoluteFill} 
              driverLocation={driverLocation}
              userLocation={selectedCoords}
              radiusCenter={selectedCoords}
              radiusMeters={fareDetails.radius * 1000}
              initialRegion={selectedCoords ? {
                latitude: selectedCoords.lat - 0.003, // offset slightly for bottom sheet layout
                longitude: selectedCoords.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              } : undefined}
            />
          </View>
        )}

        {/* Clean Background when map is hidden (idle state) */}
        {bookingState === "idle" && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
        )}

        {/* Top Header */}
        <View style={[styles.taskHeader, { 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 12),
          borderBottomWidth: bookingState === "idle" ? 1 : 0,
          borderColor: colors.border,
          backgroundColor: bookingState === "idle" ? colors.surface : (theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)'),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: bookingState === "idle" ? 0 : 0.05,
          shadowRadius: 10,
          elevation: bookingState === "idle" ? 0 : 4
        }]}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (bookingState === "booking") {
                handleCancelBooking();
              } else if (bookingState === "success") {
                handleReset();
              } else {
                router.back();
              }
            }}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.taskHeaderTitle}>Hours book</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* First Phase: Idle Configuration Form (No BottomSheet, normal ScrollView directly below header) */}
        {bookingState === "idle" ? (
          <ScrollView 
            style={{ marginTop: insets.top + (Platform.OS === 'web' ? 20 : 12) + 59, flex: 1 }}
            contentContainerStyle={[styles.taskScrollContent, { paddingBottom: insets.bottom + 20 }]} 
            showsVerticalScrollIndicator={false}
          >
            {/* Address Selection Card */}
            <View style={styles.taskSectionCard}>
              <Text style={styles.taskSectionLabel}>SELECT WORK LOCATION</Text>
              <TouchableOpacity 
                style={styles.taskAddressBox} 
                onPress={() => setIsLocationSheetOpen(true)}
                activeOpacity={0.8}
              >
                <View style={styles.taskAddressIconWrap}>
                  <Ionicons name="location" size={22} color={colors.text} />
                </View>
                <View style={styles.taskAddressTextWrap}>
                  <Text style={styles.taskAddressTitle}>
                    {selectedAddress?.label || "Select Address"}
                  </Text>
                  <Text style={styles.taskAddressSub} numberOfLines={2}>
                    {selectedAddress?.addressLine || "Tap here to search and select the address where you need the work done"}
                  </Text>
                </View>
                <Feather name="edit-2" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Time Duration Section */}
            <View style={styles.taskSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.taskSectionLabel}>WORK TIME DURATION</Text>
                {durationOption !== "custom" && (
                  <Text style={styles.selectionIndicator}>{durationOption} {durationOption === "1" ? "Hour" : "Hours"}</Text>
                )}
              </View>
              <View style={styles.presetGrid}>
                {["1", "2", "3", "4"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.presetPill,
                      durationOption === opt && styles.presetPillActive
                    ]}
                    onPress={() => {
                      setDurationOption(opt);
                      setCustomDuration("");
                    }}
                  >
                    <Text style={[
                      styles.presetPillText,
                      durationOption === opt && styles.presetPillTextActive
                    ]}>
                      {opt} {opt === "1" ? "Hr" : "Hrs"}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    durationOption === "custom" && styles.presetPillActive
                  ]}
                  onPress={() => setDurationOption("custom")}
                >
                  <Text style={[
                    styles.presetPillText,
                    durationOption === "custom" && styles.presetPillTextActive
                  ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {durationOption === "custom" && (
                <View style={styles.customInputWrapper}>
                  <Text style={styles.customInputLabel}>Specify Hours</Text>
                  <View style={styles.customInputContainer}>
                    <Feather name="clock" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.customTextInput}
                      placeholder="Enter custom duration (e.g., 6)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={customDuration}
                      onChangeText={setCustomDuration}
                    />
                    <Text style={styles.inputUnit}>hours</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Distance Radius Section */}
            <View style={styles.taskSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.taskSectionLabel}>WORKER DISTANCE RADIUS</Text>
                {radiusOption !== "custom" && (
                  <Text style={styles.selectionIndicator}>Within {radiusOption} km</Text>
                )}
              </View>
              <View style={styles.presetGrid}>
                {["2", "5", "10", "15"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.presetPill,
                      radiusOption === opt && styles.presetPillActive
                    ]}
                    onPress={() => {
                      setRadiusOption(opt);
                      setCustomRadius("");
                    }}
                  >
                    <Text style={[
                      styles.presetPillText,
                      radiusOption === opt && styles.presetPillTextActive
                    ]}>
                      {opt} km
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    radiusOption === "custom" && styles.presetPillActive
                  ]}
                  onPress={() => setRadiusOption("custom")}
                >
                  <Text style={[
                    styles.presetPillText,
                    radiusOption === "custom" && styles.presetPillTextActive
                  ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {radiusOption === "custom" && (
                <View style={styles.customInputWrapper}>
                  <Text style={styles.customInputLabel}>Specify Distance</Text>
                  <View style={styles.customInputContainer}>
                    <Feather name="navigation" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.customTextInput}
                      placeholder="Enter custom distance (e.g., 25)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={customRadius}
                      onChangeText={setCustomRadius}
                    />
                    <Text style={styles.inputUnit}>km</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Estimated Fare Card */}
            <View style={styles.taskSectionCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={styles.taskSectionLabel}>ESTIMATED FARE</Text>
                  <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>₹{fareDetails.total}</Text>
                </View>
                <TouchableOpacity 
                  style={{ 
                    flexDirection: "row", 
                    alignItems: "center", 
                    backgroundColor: colors.surfaceSecondary, 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 8 
                  }}
                  onPress={() => setShowFareBreakdown(!showFareBreakdown)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary, marginRight: 4 }}>
                    {showFareBreakdown ? "Hide Details" : "View Bill"}
                  </Text>
                  <Feather name={showFareBreakdown ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {showFareBreakdown && (
                <View style={{ marginTop: 14, borderTopWidth: 1, borderColor: colors.borderLight, paddingTop: 14, gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>Base Reservation Fee</Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: "700" }}>₹{fareDetails.baseFare}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>
                      Duration Charge ({fareDetails.hours} {fareDetails.hours === 1 ? "hr" : "hrs"} @ ₹120/hr)
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: "700" }}>₹{fareDetails.durationCharge}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>
                      Travel Radius Allowance ({fareDetails.radius} km)
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: "700" }}>₹{fareDetails.radiusCharge}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>Platform Fee</Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: "700" }}>₹{fareDetails.platformFee}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>Taxes & GST (5%)</Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: "700" }}>₹{fareDetails.taxes}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Information Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                This will request available helpers within your specified radius to book them for the hours selected. You'll be matched with a captain instantly.
              </Text>
            </View>

            {/* Book Button */}
            <TouchableOpacity 
              style={styles.bookButton} 
              onPress={handleBook}
              activeOpacity={0.9}
            >
              <Text style={styles.bookButtonText}>Book Helper Now</Text>
              <Feather name="arrow-right" size={20} color={colors.surface} />
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* Second & Third Phase: Bottom Sheet overlays map for finding and success states */
          <BottomSheet 
            style={styles.bottomSheet}
            defaultHeight={bookingState === "success" ? 395 : 240}
          >
            {bookingState === "booking" && (
              <View style={styles.sheetBookingContainer}>
                <View style={styles.sheetRadarRow}>
                  <View style={styles.sheetRadarContainer}>
                    <Animated.View style={[styles.sheetPulseCircle, {
                      transform: [{ scale: pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
                      opacity: pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
                    }]} />
                    <Animated.View style={[styles.sheetPulseCircle, {
                      transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                      opacity: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
                    }]} />
                    <View style={styles.sheetCenterRadarIcon}>
                      <Ionicons name="search" size={20} color={colors.surface} />
                    </View>
                  </View>
                  <View style={styles.sheetRadarTextCol}>
                    <Text style={styles.sheetRadarTitle}>Finding Your Helper</Text>
                    <Text style={styles.sheetRadarStatus}>{searchingStatus}</Text>
                  </View>
                </View>

                <View style={styles.sheetRadarDetailsCard}>
                  <Text style={styles.sheetRadarDetailsText}>
                    Requesting work duration of <Text style={{ fontWeight: '700' }}>{finalDuration} {finalDuration === "1" ? "hour" : "hours"}</Text> within a <Text style={{ fontWeight: '700' }}>{finalRadius} km</Text> radius. Est. Fare: <Text style={{ fontWeight: '700', color: colors.primary }}>₹{fareDetails.total}</Text>
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.sheetCancelBookingBtn} 
                  onPress={handleCancelBooking}
                >
                  <Text style={styles.sheetCancelBookingText}>Cancel Request</Text>
                </TouchableOpacity>
              </View>
            )}

            {bookingState === "success" && (
              <View style={styles.sheetSuccessContainer}>
                <View style={styles.sheetSuccessHeaderRow}>
                  <View style={styles.sheetSuccessIconBadge}>
                    <Feather name="check" size={24} color={colors.surface} />
                  </View>
                  <View style={styles.sheetSuccessTextCol}>
                    <Text style={styles.sheetSuccessTitle}>Helper Found & Booked!</Text>
                    <Text style={styles.sheetSuccessSubtitle}>
                      Captain has accepted your request.
                    </Text>
                  </View>
                </View>

                {/* Helper Details */}
                <View style={styles.helperCard}>
                  <Image 
                    source={{ uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" }} 
                    style={styles.helperAvatar} 
                  />
                  <View style={styles.helperInfo}>
                    <Text style={styles.helperName}>{driverInfo?.name || "Sarah Jenkins"}</Text>
                    <Text style={styles.helperTag}>General Helper & Task Specialist</Text>
                    <View style={styles.helperRatingRow}>
                      <Ionicons name="star" size={14} color="#EAB308" />
                      <Text style={styles.helperRating}>4.9</Text>
                      <Text style={styles.helperTasks}>• 148 tasks completed</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.successMetaBox}>
                  <View style={styles.successMetaItem}>
                    <Text style={styles.metaItemLabel}>TIME REMAINING</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Feather name="clock" size={13} color={colors.primary} />
                      <Text style={[styles.metaItemValue, { color: colors.primary }]}>{formatCountdown(secondsRemaining)}</Text>
                    </View>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.successMetaItem}>
                    <Text style={styles.metaItemLabel}>TOTAL FARE</Text>
                    <Text style={styles.metaItemValue}>₹{fareDetails.total}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.successMetaItem}>
                    <Text style={styles.metaItemLabel}>EST. ARRIVAL</Text>
                    <Text style={styles.metaItemValue}>8-12 mins</Text>
                  </View>
                </View>

                <View style={styles.sheetSuccessActionsRow}>
                  <TouchableOpacity 
                    style={[styles.successCallBtn, { flex: 1, marginBottom: 10 }]}
                    onPress={() => {
                      router.push("/tracking");
                    }}
                  >
                    <Feather name="map-pin" size={18} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={styles.successCallBtnText}>Track Order</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.successChatBtn, { flex: 1, marginBottom: 10, position: "relative" }]}
                    onPress={() => {
                      router.push("/chat");
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses" size={18} color={colors.surface} style={{ marginRight: 6 }} />
                    <Text style={styles.successChatBtnText}>Chat with {driverInfo?.name ? driverInfo.name.split(" ")[0] : "Sarah"}</Text>
                    {unreadCount > 0 && (
                      <View style={{
                        position: "absolute",
                        top: -5,
                        right: -5,
                        backgroundColor: colors.error || "#ba1a1a",
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 5,
                        borderWidth: 1.5,
                        borderColor: colors.surface,
                        elevation: 4,
                      }}>
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </BottomSheet>
        )}

        <LocationPickerSheet
          isOpen={isLocationSheetOpen}
          onClose={() => setIsLocationSheetOpen(false)}
          onSelectAddress={(address) => setSelectedAddress(address)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapBackground 
        ref={mapRef}
        style={StyleSheet.absoluteFill} 
        markers={nearbyPlaces}
        onMarkerPress={handleMarkerPress}
        mapType={mapType}
      />

      {/* Map Action Buttons */}
      <View style={[styles.mapActions, { top: insets.top + (Platform.OS === 'web' ? 70 : 10) + 70 }]}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => setMapType(m => m === 'standard' ? 'satellite' : 'standard')}
        >
          <Feather name="layers" size={20} color={mapType === 'satellite' ? colors.primary : colors.text} />
        </TouchableOpacity>
      </View>

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
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{label || "Select Location"}</Text>
        </View>
      </View>

      {/* Detail Card Overlay when place is selected */}
      {selectedPlace && (
        <View style={[styles.detailOverlay, { bottom: 340 }]}>
          <TouchableOpacity 
            style={styles.closeDetail}
            onPress={() => setSelectedPlace(null)}
          >
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.detailCard}>
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selectedPlace.name}</Text>
              <Text style={styles.detailAddress} numberOfLines={2}>{selectedPlace.address}</Text>
              <View style={styles.ratingRow}>
                <View style={styles.starBox}>
                  <Feather name="star" size={14} color="#EAB308" />
                  <Text style={styles.ratingText}>{selectedPlace.rating || 'N/A'}</Text>
                </View>
                <Text style={styles.userCount}>({selectedPlace.user_ratings_total || 0} reviews)</Text>
                {selectedPlace.open_now !== undefined && (
                  <View style={[styles.statusTag, { backgroundColor: selectedPlace.open_now ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Text style={[styles.statusText, { color: selectedPlace.open_now ? '#166534' : '#991B1B' }]}>
                      {selectedPlace.open_now ? 'OPEN' : 'CLOSED'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.orderBtn} onPress={() => router.push({ pathname: "/chat", params: { placeId: selectedPlace.id } })}>
              <Text style={styles.orderBtnText}>Order Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Sheet with Search Bar */}
      <BottomSheet style={styles.bottomSheet}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Where to?</Text>
          <Text style={styles.sheetSubtitle}>
            Search for a location to start your {label?.toLowerCase()} delivery
          </Text>

          <View style={styles.searchContainer}>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="search" size={20} color={colors.textMuted} />}
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street name..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Location Suggestions (Mock) */}
          <View style={styles.suggestions}>
             {/* If we have nearby places, maybe show them in list too? */}
             {["Food", "Grocery", "Meds"].includes(label as string) && nearbyPlaces.length > 0 ? (
               nearbyPlaces.slice(0, 5).map((place) => (
                <TouchableOpacity 
                  key={place.id} 
                  style={styles.suggestionItem}
                  onPress={() => handleMarkerPress(place)}
                >
                  <View style={[styles.suggestionIconBox, { backgroundColor: label === 'Meds' ? '#FEF2F2' : label === 'Grocery' ? '#F0FDF4' : '#F0F9FF' }]}>
                    <Feather 
                      name={label === 'Meds' ? 'plus-square' : label === 'Grocery' ? 'shopping-cart' : 'shopping-bag'} 
                      size={18} 
                      color={label === 'Meds' ? '#EF4444' : label === 'Grocery' ? '#22C55E' : '#0EA5E9'} 
                    />
                  </View>
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionTitle}>{place.name}</Text>
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>{place.address}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>
               ))
             ) : (
                <>
                  <TouchableOpacity style={styles.suggestionItem}>
                    <View style={styles.suggestionIconBox}>
                      <Feather name="map-pin" size={18} color={colors.textSecondary} />
                    </View>
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionTitle}>Set location on map</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={colors.textMuted} />
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
                    <Feather name="chevron-right" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
             )}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
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
    color: colors.text,
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
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    paddingBottom: 40,
  },

  sheetContent: {
    gap: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  suggestions: {
    marginTop: 8,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceSecondary,
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
    color: colors.text,
  },
  suggestionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 54,
  },
  detailOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 100,
  },
  closeDetail: {
    position: "absolute",
    top: -45,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  detailInfo: {
    flex: 1,
    gap: 4,
  },
  detailName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  detailAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  starBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#854D0E",
  },
  userCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  orderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  orderBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  mapActions: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    gap: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  taskHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  taskScrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  taskSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow || "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectionIndicator: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  taskSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  taskAddressBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskAddressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskAddressTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  taskAddressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  taskAddressSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  presetPill: {
    flex: 1,
    minWidth: 70,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  presetPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  presetPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  presetPillTextActive: {
    color: colors.surface,
  },
  customInputWrapper: {
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 14,
  },
  customInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    fontWeight: "500",
  },
  bookButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: colors.shadow || "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  bookButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800",
  },
  overlayContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 1000,
  },
  radarContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  pulseCircle: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
  },
  centerRadarIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  radarTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  radarStatus: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 20,
    textAlign: "center",
  },
  radarDetails: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 40,
  },
  cancelBookingBtn: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelBookingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success || "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: colors.success || "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  helperCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  helperAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  helperInfo: {
    flex: 1,
  },
  helperName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  helperTag: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  helperRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  helperRating: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 4,
    marginRight: 6,
  },
  helperTasks: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  successMetaBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  successMetaItem: {
    flex: 1,
    alignItems: "center",
  },
  metaItemLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaItemValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  successChatBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 10,
  },
  successChatBtnText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  successCallBtn: {
    backgroundColor: "transparent",
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  successCallBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  sheetBookingContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    gap: 16,
  },
  sheetRadarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sheetRadarContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  sheetPulseCircle: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  sheetCenterRadarIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 5,
  },
  sheetRadarTextCol: {
    flex: 1,
    gap: 4,
  },
  sheetRadarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
  },
  sheetRadarStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  sheetRadarDetailsCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetRadarDetailsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sheetCancelBookingBtn: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetCancelBookingText: {
    color: colors.error || "#EF4444",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetSuccessContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    gap: 16,
  },
  sheetSuccessHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sheetSuccessIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success || "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.success || "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sheetSuccessTextCol: {
    flex: 1,
    gap: 2,
  },
  sheetSuccessTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
  },
  sheetSuccessSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sheetSuccessActionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
});
