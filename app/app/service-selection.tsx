import React, { useEffect, useState, useRef, useCallback } from "react";
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
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useThemeStore } from "@/contexts/themeStore";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";
import { customFetch } from "@/utils/api/custom-fetch";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { SlideToConfirm } from "@/components/SlideToConfirm";
import { RollingNumber } from "@/components/RollingNumber";
import { socketService } from "@/utils/socketService";
import { useDeliveryStore } from "@/contexts/deliveryStore";

const MIN_CUSTOM_PRICE = 50;

const PRICE_SLIDER_STEPS = [
  { label: "-10", offset: -10 },
  { label: "◆", offset: 0 },
  { label: "+10", offset: 10 },
  { label: "+20", offset: 20 },
  { label: "+30", offset: 30 },
  { label: "+40", offset: 40 },
];

export default function ServiceSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { label, radiusKm } = useLocalSearchParams<{ label: string; radiusKm?: string }>();
  const initialRadiusKm = Number(radiusKm);
  const hasRoutedRadius = Number.isFinite(initialRadiusKm) && initialRadiusKm > 0;
  const routedRadiusKm = hasRoutedRadius ? String(initialRadiusKm) : "2";
  const mapType = "standard";
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
  const [radiusOption, setRadiusOption] = useState<string>(["2", "5", "10", "15"].includes(routedRadiusKm) ? routedRadiusKm : "custom");
  const [customRadius, setCustomRadius] = useState<string>(["2", "5", "10", "15"].includes(routedRadiusKm) ? "" : routedRadiusKm);
  const [bookingState, setBookingState] = useState<"idle" | "booking" | "success">("idle");
  const [searchingStatus, setSearchingStatus] = useState<string>("Initializing booking...");
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [showPriceSheet, setShowPriceSheet] = useState(false);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [priceInputText, setPriceInputText] = useState("");
  const [sliderIndex, setSliderIndex] = useState(1);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  
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

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const activeStr = await AsyncStorage.getItem("active_address");
          if (activeStr) {
            setSelectedAddress(JSON.parse(activeStr));
          }
        } catch (e) {
          console.error("Failed to load active address:", e);
        }
      })();
    }, [])
  );

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

  useEffect(() => {
    if (label !== "Task" || bookingState !== "booking") {
      setNearbyDrivers([]);
      return;
    }

    const coords = getSelectedCoords();
    if (!coords) return;

    const radius = radiusOption === "custom"
      ? parseFloat(customRadius) || 2
      : parseFloat(radiusOption) || 2;
    const radiusMeters = Math.round(radius * 1000);

    const loadNearbyDrivers = async () => {
      try {
        const drivers = await customFetch<any[]>(
          `/api/v1/drivers/nearby?latitude=${coords.lat}&longitude=${coords.lng}&radius=${radiusMeters}`,
          { responseType: "json" },
        );
        setNearbyDrivers((drivers || []).map((driver) => ({
          id: driver._id || driver.id,
          vehicleType: driver.vehicleType || "car",
          lat: driver.currentLocation?.coordinates?.[1],
          lng: driver.currentLocation?.coordinates?.[0],
        })).filter((driver) => Number.isFinite(driver.lat) && Number.isFinite(driver.lng)));
      } catch (error) {
        console.warn("Unable to load nearby online drivers for helper search", error);
      }
    };

    loadNearbyDrivers();
    const interval = setInterval(loadNearbyDrivers, 12000);
    return () => clearInterval(interval);
  }, [label, bookingState, selectedAddress, radiusOption, customRadius]);

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
      const selectedPrice = customPrice || fare.total;
      const res = await customFetch<{ _id: string }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          stops: orderStops,
          serviceType: "helper",
          totals: { total: selectedPrice, subtotal: fare.baseFare },
          radius: fare.radius,
          duration: fare.hours,
          customerPrice: selectedPrice,
        })
      });
      setCurrentOrderId(res._id);
    } catch (e: any) {
      Alert.alert("Booking Failed", e.message);
      setBookingState("idle");
    }
  };

  const handleCancelBooking = async () => {
    const orderIdToCancel = currentOrderId;
    setBookingState("idle");
    setDriverLocation(null);
    setCurrentOrderId(null);

    if (orderIdToCancel) {
      try {
        await customFetch(`/api/v1/orders/${orderIdToCancel}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELLED" }),
        });
      } catch (e: any) {
        console.error("Failed to cancel order on backend:", e);
      }
    }
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
      const radiusMeters = hasRoutedRadius ? Math.round(initialRadiusKm * 1000) : 5000;
      const data = await customFetch<any[]>(`/api/v1/places/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}&keyword=${encodeURIComponent(keyword)}`);
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
    const baseFare = fareDetails.total;
    const activeFare = customPrice ?? baseFare;

    const openPriceSheet = () => {
      const currentVal = customPrice ?? baseFare;
      setPriceInputText(String(currentVal));
      
      const diff = currentVal - baseFare;
      const foundIdx = PRICE_SLIDER_STEPS.findIndex(s => s.offset === diff);
      if (foundIdx !== -1) {
        setSliderIndex(foundIdx);
      } else {
        let closestIdx = 1;
        let minDiff = Infinity;
        PRICE_SLIDER_STEPS.forEach((step, idx) => {
          const stepVal = Math.max(MIN_CUSTOM_PRICE, baseFare + step.offset);
          const d = Math.abs(currentVal - stepVal);
          if (d < minDiff) {
            minDiff = d;
            closestIdx = idx;
          }
        });
        setSliderIndex(closestIdx);
      }
      setShowPriceSheet(true);
    };

    const getPriceAtStep = (stepOffset: number) => {
      return Math.max(MIN_CUSTOM_PRICE, baseFare + stepOffset);
    };

    const selectStep = (index: number) => {
      setSliderIndex(index);
      const stepVal = getPriceAtStep(PRICE_SLIDER_STEPS[index].offset);
      setPriceInputText(String(stepVal));
    };

    const applyPriceInput = () => {
      const parsed = Number.parseInt(priceInputText.replace(/\D/g, ""), 10);
      if (!Number.isFinite(parsed) || parsed < MIN_CUSTOM_PRICE) {
        Alert.alert("Invalid price", `Enter a price of at least ₹${MIN_CUSTOM_PRICE}.`);
        return;
      }
      setCustomPrice(parsed);
      setShowPriceSheet(false);
    };

    return (
      <View style={styles.root}>
        {/* Background Map - ALWAYS visible */}
        <View style={StyleSheet.absoluteFill}>
          <MapBackground 
            ref={mapRef}
            style={StyleSheet.absoluteFill} 
            driverLocation={driverLocation}
            userLocation={selectedCoords}
            driverMarkers={nearbyDrivers}
            radiusCenter={selectedCoords}
            radiusMeters={fareDetails.radius * 1000}
            initialRegion={selectedCoords ? {
              latitude: selectedCoords.lat - 0.003,
              longitude: selectedCoords.lng,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            } : undefined}
          />
        </View>

        {bookingState === "idle" ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC', zIndex: 20 }]}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 16),
              paddingBottom: 16,
              backgroundColor: '#F8FAFC',
            }}>
              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#F1F5F9',
                }}
                onPress={() => router.back()}
              >
                <Feather name="arrow-left" size={20} color="#1E293B" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', letterSpacing: 0.5 }}>
                  RESERVE SHOPPING SLOT
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Book your time. Shop stress-free.
                </Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Banner Card */}
              <View style={{
                backgroundColor: '#EEF2FF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                flexDirection: 'row',
                overflow: 'hidden',
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <View style={{ flex: 1, zIndex: 2 }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>Pick your time.</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#4F46E5', marginBottom: 8 }}>Enjoy your shopping!</Text>
                  <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, paddingRight: 20 }}>
                    Reserve a personal slot and shop at your convenience.
                  </Text>
                </View>
                {/* Simulated Image Placeholder */}
                <View style={{ position: 'absolute', right: -20, bottom: -10, opacity: 0.8 }}>
                  <Ionicons name="cart" size={100} color="#C7D2FE" />
                </View>
              </View>

              {/* Store Location Card */}
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
                elevation: 1,
                borderWidth: 1,
                borderColor: '#F1F5F9'
              }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Feather name="map-pin" size={20} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' }}>Store Location</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', lineHeight: 20 }} numberOfLines={2}>
                    {selectedAddress?.addressLine || "Select store location"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/delivery/saved-addresses")} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12 }}>
                  <Text style={{ color: '#4F46E5', fontWeight: '600', fontSize: 14, marginRight: 4 }}>Change</Text>
                  <Feather name="chevron-right" size={16} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              {/* Duration Card */}
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
                elevation: 1,
                borderWidth: 1,
                borderColor: '#F1F5F9'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Feather name="clock" size={18} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 2, textTransform: 'uppercase' }}>Duration</Text>
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>Choose how long you want to shop</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  {[
                    { label: "1 HOUR", value: "1", icon: "clock" },
                    { label: "2 HOURS", value: "2", icon: "clock" },
                    { label: "CUSTOM", value: "custom", icon: "calendar" },
                  ].map((opt) => {
                    const isActive = durationOption === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={{
                          flex: 1,
                          height: 60,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isActive ? '#4F46E5' : '#E2E8F0',
                          backgroundColor: isActive ? '#4F46E5' : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative'
                        }}
                        onPress={() => {
                          setDurationOption(opt.value);
                          if (opt.value !== "custom") setCustomDuration("");
                        }}
                      >
                        {isActive && (
                          <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#FFF', borderRadius: 8, padding: 2 }}>
                            <Feather name="check" size={10} color="#4F46E5" />
                          </View>
                        )}
                        <Feather name={opt.icon as any} size={16} color={isActive ? '#FFFFFF' : '#475569'} style={{ marginBottom: 4 }} />
                        <Text style={{
                          fontSize: 12,
                          fontWeight: isActive ? '700' : '600',
                          color: isActive ? '#FFFFFF' : '#1E293B'
                        }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {durationOption === "custom" && (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      style={[styles.modernCustomInput, { height: 44 }]}
                      placeholder="Enter hours (e.g. 3)"
                      placeholderTextColor="#A1A1AA"
                      keyboardType="numeric"
                      value={customDuration}
                      onChangeText={setCustomDuration}
                    />
                  </View>
                )}
              </View>

              {/* Shopping Area (Radius) Card */}
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
                elevation: 1,
                borderWidth: 1,
                borderColor: '#F1F5F9'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Feather name="target" size={18} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 2, textTransform: 'uppercase' }}>Shopping Area (Radius)</Text>
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>Select the area you want to shop in</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  {[
                    { label: "2 KM", value: "2", icon: "disc" },
                    { label: "5 KM", value: "5", icon: "disc" },
                    { label: "CUSTOM", value: "custom", icon: "edit-2" },
                  ].map((opt) => {
                    const isActive = radiusOption === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={{
                          flex: 1,
                          height: 60,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isActive ? '#4F46E5' : '#E2E8F0',
                          backgroundColor: isActive ? '#4F46E5' : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative'
                        }}
                        onPress={() => {
                          setRadiusOption(opt.value);
                          if (opt.value !== "custom") setCustomRadius("");
                        }}
                      >
                        {isActive && (
                          <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#FFF', borderRadius: 8, padding: 2 }}>
                            <Feather name="check" size={10} color="#4F46E5" />
                          </View>
                        )}
                        <Feather name={opt.icon as any} size={16} color={isActive ? '#FFFFFF' : '#475569'} style={{ marginBottom: 4 }} />
                        <Text style={{
                          fontSize: 12,
                          fontWeight: isActive ? '700' : '600',
                          color: isActive ? '#FFFFFF' : '#1E293B'
                        }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {radiusOption === "custom" && (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      style={[styles.modernCustomInput, { height: 44 }]}
                      placeholder="Enter distance (e.g. 10)"
                      placeholderTextColor="#A1A1AA"
                      keyboardType="numeric"
                      value={customRadius}
                      onChangeText={setCustomRadius}
                    />
                  </View>
                )}
                
                {/* Info Box */}
                <View style={{ 
                  marginTop: 16, 
                  backgroundColor: '#F5F3FF', 
                  borderRadius: 8, 
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Feather name="info" size={14} color="#8B5CF6" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 11, color: '#6D28D9', flex: 1 }}>
                    We will show stores within the selected radius of your location.
                  </Text>
                </View>
              </View>

              {/* Total Price Card */}
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
                elevation: 1,
                borderWidth: 1,
                borderColor: '#F1F5F9',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <Feather name="tag" size={20} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 2, textTransform: 'uppercase' }}>Total Price</Text>
                    <TouchableOpacity onPress={openPriceSheet} style={{ flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>₹{activeFare}</Text>
                      <View style={{ marginLeft: 8, backgroundColor: '#F1F5F9', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="edit-2" size={12} color="#64748B" />
                      </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Feather name="check-circle" size={12} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Inclusive of all taxes & fees</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                  <Feather name="shield" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>Secure Booking</Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              backgroundColor: '#F8FAFC',
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
              alignItems: 'center',
            }}>
              <SlideToConfirm
                onConfirm={handleBook}
                title={`CONFIRM RESERVATION • ₹${activeFare}`}
                colors={colors}
              />
            </View>
          </View>
        ) : (
          /* Second & Third Phase: Map & Bottom Sheet overlays map for finding and success states */
          <>
            {/* Top Header for Booking/Success State */}
            <View style={[styles.modernHeader, { 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 16),
              backgroundColor: 'transparent'
            }]}>
              <TouchableOpacity 
                style={styles.modernBackBtn} 
                onPress={() => {
                  if (bookingState === "booking") handleCancelBooking();
                  else if (bookingState === "success") handleReset();
                }}
              >
                <View style={styles.glassCircle}>
                  <Feather name="arrow-left" size={22} color={colors.text} />
                </View>
              </TouchableOpacity>
            </View>

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
                    Requesting work duration of <Text style={{ fontWeight: '700' }}>{finalDuration} {finalDuration === "1" ? "hour" : "hours"}</Text> within a <Text style={{ fontWeight: '700' }}>{finalRadius} km</Text> radius. Est. Fare: <Text style={{ fontWeight: '700', color: colors.primary }}>Rs.{activeFare}</Text>
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
                    <Text style={styles.metaItemValue}>Rs.{activeFare}</Text>
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
                      const rad = radiusOption === "custom" ? customRadius : radiusOption;
                      router.push({ pathname: "/helper-task", params: { radius: rad } });
                    }}
                  >
                    <Feather name="clipboard" size={18} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={styles.successCallBtnText}>Assign Task</Text>
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
          </>
        )}
        <Modal
          visible={showPriceSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPriceSheet(false)}
        >
          <KeyboardAvoidingView
            style={styles.modernPriceSheetOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity style={styles.modernPriceSheetScrim} activeOpacity={1} onPress={() => setShowPriceSheet(false)} />
            <View style={[styles.modernPriceSheet, { paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.modernSheetHandle} />
              
              <Text style={styles.modernPriceSheetTitle}>Set your custom price</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 24, gap: 16 }}>
                <TouchableOpacity 
                  onPress={() => {
                    const current = parseInt(priceInputText) || baseFare;
                    if (current > baseFare) {
                      setPriceInputText(String(current - 1));
                    }
                  }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="minus" size={24} color="#475569" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: '#1E293B', marginRight: 4 }}>₹</Text>
                  <TextInput
                    style={{ fontSize: 40, fontWeight: '800', color: '#1E293B', minWidth: 80, textAlign: 'center', padding: 0 }}
                    keyboardType="numeric"
                    value={priceInputText}
                    onChangeText={setPriceInputText}
                    selectionColor="#4F46E5"
                  />
                </View>

                <TouchableOpacity 
                  onPress={() => {
                    const current = parseInt(priceInputText) || baseFare;
                    setPriceInputText(String(current + 1));
                  }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="plus" size={24} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              <View style={styles.modernPriceTipRow}>
                <View style={styles.modernTipIconBox}>
                  <Ionicons name="bulb" size={14} color="#F59E0B" />
                </View>
                <Text style={styles.modernPriceTipText}>Higher the price, faster the matching process</Text>
              </View>

              {/* Custom Bar with -20 -10 0 10 20 */}
              <View style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 30 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
                  {[-20, -10, 0, 10, 20].map(val => (
                    <Text key={val} style={{ fontSize: 12, color: '#64748B', fontWeight: '700' }}>
                      {val > 0 ? `+${val}` : val === 0 ? '0' : val}
                    </Text>
                  ))}
                </View>
                <View style={{ height: 30, justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', left: 10, right: 10, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {[-20, -10, 0, 10, 20].map((val) => (
                      <TouchableOpacity
                        key={val}
                        onPress={() => {
                          if (val === 0) {
                            setPriceInputText(String(baseFare));
                          } else {
                            const current = parseInt(priceInputText) || baseFare;
                            setPriceInputText(String(Math.max(baseFare, current + val)));
                          }
                        }}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: '#FFF',
                          borderWidth: 2,
                          borderColor: '#4F46E5',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#4F46E5',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={applyPriceInput} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.primary, '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modernPriceSheetBookButton}
                >
                  <Text style={styles.modernPriceSheetBookText}>Set price to ₹{priceInputText}</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modernPriceSheetRemoveButton}
                onPress={() => {
                  setCustomPrice(null);
                  setPriceInputText(String(baseFare));
                  setShowPriceSheet(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modernPriceSheetRemoveText}>✕ Remove custom price</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  // --- Modern Redesign Styles ---
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  modernBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  modernHeaderTitleContainer: {
    flex: 1,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  modernHeaderTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  modernHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 4,
  },
  modernScrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  modernCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  modernCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainerBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)', // Light purple/primary tint
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  modernInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modernInputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  modernInputPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  modernPresetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modernPresetButton: {
    flex: 1,
    height: 72,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modernPresetButtonActive: {
    borderColor: 'transparent',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modernPresetLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  modernPresetLabelActive: {
    color: '#ffffff',
  },
  modernPresetSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  modernPresetSubtextActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modernCustomTextInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 56,
  },
  modernCustomInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modernCustomSuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 8,
  },
  modernFloatingBottom: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 20,
  },
  modernBottomCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  modernPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  modernPriceCol: {
    gap: 4,
  },
  modernPriceHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modernPriceEditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernPriceValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  modernPriceEditBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernTaxesCol: {
    alignItems: 'flex-end',
  },
  modernTaxesText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernConfirmButton: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modernConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modernConfirmArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modern Price Sheet Modal Styles
  modernPriceSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modernPriceSheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modernPriceSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 24,
  },
  modernSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  modernPriceSheetTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modernLargePriceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  modernLargePricePrefix: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 6,
    marginRight: 4,
  },
  modernLargePriceText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },
  modernPriceTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  modernTipIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernPriceTipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  modernSliderLabelTextActive: {
    color: colors.primary,
    fontWeight: '900',
    transform: [{ scale: 1.1 }],
  },
  modernSliderTrackLineBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  modernSliderTrackLineActive: {
    position: 'absolute',
    left: 0,
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  modernSliderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    transform: [{ translateY: -3 }],
  },
  modernSliderDotActive: {
    borderColor: colors.primary,
  },
  modernSliderDotInactive: {
    borderColor: '#E2E8F0',
  },
  modernSliderThumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: colors.primary,
    transform: [{ translateX: -14 }, { translateY: -11 }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernPriceSheetBookButton: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 8,
  },
  modernPriceSheetBookText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modernPriceSheetRemoveButton: {
    alignSelf: 'center',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 8,
  },
  modernPriceSheetRemoveText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
  // --- End Modern Redesign Styles ---
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
  fareHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  fareTextCol: {
    flex: 1,
  },
  fareSectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  estimatedFareValue: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  inlineBookButton: {
    minWidth: 118,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
  },
  inlineBookButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
  },
  changePriceButton: {
    marginTop: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  changePriceText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  priceSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  priceSheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.58)",
  },
  priceSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 16,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  priceSheetTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  priceEstimateSubtext: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: -8,
  },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 16,
    height: 56,
    gap: 6,
  },
  priceInputPrefix: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
  },
  priceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    paddingVertical: 0,
  },
  priceSheetBookButton: {
    height: 52,
    borderRadius: 4,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    width: "100%",
  },
  priceSheetBookText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  priceSheetRemoveButton: {
    alignSelf: "center",
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
    marginTop: 4,
  },
  priceSheetRemoveText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.8,
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
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    letterSpacing: 1.2,
  },
  collectionPointCard: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#7e7576',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  collectionInputBox: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  collectionInputText: {
    fontSize: 15,
    color: '#1a1b22',
    fontWeight: '500',
  },
  collectionInputPlaceholder: {
    color: '#A1A1AA',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  presetButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#cfc4c5',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1b22',
    letterSpacing: 0.5,
  },
  presetButtonTextActive: {
    color: '#ffffff',
  },
  customTextInputWrapper: {
    marginTop: 12,
  },
  customUnderlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
    paddingVertical: 8,
    fontSize: 16,
    color: '#000000',
  },
  bottomPanel: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#E4E4E7',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bottomPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceCol: {
    flexDirection: 'column',
  },
  priceHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7e7576',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  priceOutlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  priceValueText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  taxesCol: {
    alignItems: 'flex-end',
  },
  taxesText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7e7576',
    letterSpacing: 0.5,
    lineHeight: 13,
  },
  confirmButton: {
    backgroundColor: '#000000',
    height: 52,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  largePriceBox: {
    backgroundColor: "#F4F4F5",
    borderRadius: 8,
    paddingVertical: 18,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    marginBottom: 8,
  },
  largePriceText: {
    fontSize: 38,
    fontWeight: "800",
    color: "#000000",
    fontFamily: "Inter",
  },
  priceTipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    paddingHorizontal: 8,
    width: "100%",
  },
  priceTipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#7e7576",
    textAlign: "center",
    lineHeight: 18,
  },
  sliderContainer: {
    marginVertical: 16,
    width: "100%",
    paddingHorizontal: 8,
  },
  sliderLabelsContainer: {
    height: 24,
    position: "relative",
    width: "100%",
    marginBottom: 8,
  },
  sliderLabelWrapper: {
    position: "absolute",
    width: 40,
    marginLeft: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderLabelText: {
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "600",
    color: "#7e7576",
  },
  sliderLabelTextActive: {
    color: "#000000",
    fontWeight: "800",
  },
  sliderTrackContainer: {
    height: 30,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  sliderTrackLineBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "#EEEDF7",
    borderRadius: 3,
  },
  sliderTrackLineActive: {
    position: "absolute",
    left: 0,
    height: 6,
    backgroundColor: "#000000",
    borderRadius: 3,
  },
  sliderDotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  sliderDotInactive: {
    backgroundColor: "#ffffff",
  },
  sliderDotActive: {
    backgroundColor: "#ffffff",
  },
  sliderThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#000000",
    marginLeft: -12,
  },
  sliderTouchOverlay: {
    position: "absolute",
    left: -10,
    right: -10,
    top: 0,
    bottom: 0,
    flexDirection: "row",
  },
  sliderTouchSegment: {
    flex: 1,
    height: "100%",
  },
});
