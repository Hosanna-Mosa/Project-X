import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";

const { width, height } = Dimensions.get("window");
const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

type FareEstimate = {
  distanceInKm: number;
  estimatedMinutes: number;
  fareBreakdown: {
    total: number;
  };
};

const normalizeServiceType = (serviceId?: string) => {
  if (serviceId === "bike-lite") return "bike";
  if (serviceId === "cab-prime") return "cab_prime";
  if (serviceId === "bike" || serviceId === "auto" || serviceId === "cab") {
    return serviceId;
  }
  return "cab";
};

const formatFare = (value: number) => `₹${value.toFixed(2)}`;

const RIDE_GROUPS = [
  {
    title: "Rides we think you'll like",
    options: [
      {
        id: "rideX",
        name: "RideX",
        capacity: 4,
        price: "₹181.50",
        time: "2:00pm",
        eta: "9 min",
        description: "Affordable rides all to yourself",
        image: require("@/assets/images/services/cab.png"),
      },
      {
        id: "wait-save",
        name: "Wait & Save",
        capacity: 4,
        price: "₹162.20",
        time: "2:08pm",
        eta: "10-19 min",
        description: "Get a cheaper ride by waiting a little longer",
        image: require("@/assets/images/services/cab.png"),
        hasWaitIcon: true,
      },
      {
        id: "priority",
        name: "Priority",
        capacity: 4,
        price: "₹212.40",
        time: "1:59pm",
        eta: "7 min",
        description: "Shorter waiting time",
        image: require("@/assets/images/services/cab.png"),
        hasPriorityIcon: true,
      },
      {
        id: "Ridex-reserve",
        name: "Ridex Reserve",
        capacity: 4,
        price: "₹453.90",
        time: "2:27pm",
        description: "Leave as soon as 2:27 pm",
        image: require("@/assets/images/services/cab.png"),
        badge: "Most reliable",
      },
    ],
  },
  {
    title: "Economy",
    options: [
      {
        id: "RideXl",
        name: "RideXl",
        capacity: 6,
        price: "₹253.10",
        time: "1:53pm",
        description: "Longer wait",
        image: require("@/assets/images/services/cab.png"),
      },
    ],
  },
];

// ─── Main screen ───────────────────────────────────────────────────────────
export default function RideConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    serviceId: string;
    pickupName: string;
    dropName: string;
    pickupLat: string;
    pickupLng: string;
    dropLat: string;
    dropLng: string;
    stops?: string;
  }>();

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(
    () => createStyles(colors, insets),
    [theme, insets]
  );
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const serviceType = normalizeServiceType(params.serviceId);

  const pickupCoords = {
    latitude: parseFloat(params.pickupLat || "0"),
    longitude: parseFloat(params.pickupLng || "0"),
  };
  const dropCoords = {
    latitude: parseFloat(params.dropLat || "0"),
    longitude: parseFloat(params.dropLng || "0"),
  };

  React.useEffect(() => {
    const canEstimate =
      Number.isFinite(pickupCoords.latitude) &&
      Number.isFinite(pickupCoords.longitude) &&
      Number.isFinite(dropCoords.latitude) &&
      Number.isFinite(dropCoords.longitude);

    if (!canEstimate) return;

    const loadFareEstimate = async () => {
      setFareLoading(true);
      try {
        const query = new URLSearchParams({
          pickupLat: String(pickupCoords.latitude),
          pickupLng: String(pickupCoords.longitude),
          dropLat: String(dropCoords.latitude),
          dropLng: String(dropCoords.longitude),
          serviceType,
        });
        const estimate = await customFetch<FareEstimate>(
          `/api/v1/orders/estimate-fare?${query.toString()}`,
          { responseType: "json" },
        );
        setFareEstimate(estimate);
      } catch (error) {
        console.error("Fare estimate error:", error);
      } finally {
        setFareLoading(false);
      }
    };

    loadFareEstimate();
  }, [
    pickupCoords.latitude,
    pickupCoords.longitude,
    dropCoords.latitude,
    dropCoords.longitude,
    serviceType,
  ]);

  const backendFare = fareEstimate?.fareBreakdown?.total;
  const backendEta = fareEstimate?.estimatedMinutes
    ? `${fareEstimate.estimatedMinutes} min`
    : undefined;
  const getBackendPrice = (fallback: string, multiplier = 1) =>
    backendFare ? formatFare(backendFare * multiplier) : fallback;

  const RIDE_GROUPS = React.useMemo(() => {
    if (params.serviceId === "bike" || params.serviceId === "bike-lite") {
      return [
        {
          title: "Bikes for you",
          options: [
            {
              id: "bike-ride",
              name: "Bike Ride",
              capacity: 1,
              price: "₹45.00",
              time: "2:00pm",
              eta: "3 min",
              description: "Quick bike ride",
              image: require("@/assets/images/services/bike.png"),
            },
            {
              id: "bike-reserve",
              name: "Bike Reserve",
              capacity: 1,
              price: "₹60.00",
              time: "2:15pm",
              description: "Reserve a bike for later",
              image: require("@/assets/images/services/bike.png"),
              badge: "Planned",
            },
          ]
        }
      ];
    } else if (params.serviceId === "auto") {
      return [
        {
          title: "Autos for you",
          options: [
            {
              id: "auto-ride",
              name: "Auto Ride",
              capacity: 3,
              price: "₹80.50",
              time: "2:00pm",
              eta: "5 min",
              description: "Standard auto ride",
              image: require("@/assets/images/services/auto.png"),
            },
            {
              id: "auto-reserve",
              name: "Auto Reserve",
              capacity: 3,
              price: "₹100.00",
              time: "2:20pm",
              description: "Reserve an auto",
              image: require("@/assets/images/services/auto.png"),
              badge: "Planned",
            },
          ]
        }
      ];
    } else {
      return [
        {
          title: "Rides we think you'll like",
          options: [
            {
              id: "cab-ride",
              name: "Cab Ride",
              capacity: 4,
              price: "₹181.50",
              time: "2:00pm",
              eta: "9 min",
              description: "Affordable rides all to yourself",
              image: require("@/assets/images/services/cab.png"),
            },
            {
              id: "cab-wait-save",
              name: "Wait & Save",
              capacity: 4,
              price: "₹162.20",
              time: "2:08pm",
              eta: "10-19 min",
              description: "Get a cheaper ride by waiting a little longer",
              image: require("@/assets/images/services/cab.png"),
              hasWaitIcon: true,
            },
            {
              id: "cab-priority",
              name: "Cab Priority",
              capacity: 4,
              price: "₹212.40",
              time: "1:59pm",
              eta: "7 min",
              description: "Shorter waiting time",
              image: require("@/assets/images/services/cab.png"),
              hasPriorityIcon: true,
            },
            {
              id: "cab-x",
              name: "Cab X",
              capacity: 4,
              price: "₹253.10",
              time: "1:53pm",
              description: "Premium ride experience",
              image: require("@/assets/images/services/cab.png"),
              badge: "Premium",
            },
          ]
        }
      ];
    }
  }, [params.serviceId]);

  const displayRideGroups = React.useMemo(() => {
    const priceFor = (id: string, fallback: string) => {
      const multipliers: Record<string, number> = {
        "bike-reserve": 1.2,
        "auto-reserve": 1.2,
        "cab-wait-save": 0.9,
        "cab-priority": 1.15,
        "cab-x": 1.3,
      };
      return getBackendPrice(fallback, multipliers[id] || 1);
    };

    return RIDE_GROUPS.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        price: priceFor(option.id, option.price),
        eta: backendEta || option.eta,
      })),
    }));
  }, [RIDE_GROUPS, backendEta, backendFare]);

  const [selectedRide, setSelectedRide] = useState(displayRideGroups[0].options[0]);

  React.useEffect(() => {
    setSelectedRide(displayRideGroups[0].options[0]);
  }, [displayRideGroups]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);

  const stops = React.useMemo(() => {
    if (!params.stops) return [];
    try {
      return JSON.parse(params.stops);
    } catch (e) {
      console.error("Error parsing stops:", e);
      return [];
    }
  }, [params.stops]);

  const getDisplayName = (addr: string) => {
    if (!addr) return "";

    const parts = addr.split(",");

    return parts.length > 1 ? parts[0].trim() : addr.trim();
  };

  const handleShareRoute = async () => {
    try {
      await Share.share({
        message: `I'm heading from ${params.pickupName} to ${params.dropName}. Tracking my ride!`,
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleAddStopFromMap = () => {
    router.push({
      pathname: "/drop-location",
      params: {
        serviceId: params.serviceId,
        pickupName: params.pickupName,
        pickupLat: params.pickupLat,
        pickupLng: params.pickupLng,
        dropName: params.dropName,
        dropLat: params.dropLat,
        dropLng: params.dropLng,
        stops: params.stops,
        triggerAddStop: "true"
      }
    });
  };

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        1000
      );
    } catch {
      Alert.alert("Error", "Could not fetch current location.");
    }
  };

  return (
    <View style={styles.root}>
      {/* ─── Map ──────────────────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            ...pickupCoords,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          zoomEnabled
          scrollEnabled
          showsUserLocation={false}
          showsMyLocationButton={false}
          onMapReady={() => setMapReady(true)}
        >
          {/* Route */}
          {GOOGLE_MAPS_APIKEY && (
            <MapViewDirections
              origin={pickupCoords}
              destination={dropCoords}
              waypoints={stops.map((s: any) => ({ latitude: s.lat, longitude: s.lng }))}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor="#111827"
              optimizeWaypoints
              onReady={(result) => {
                mapRef.current?.fitToCoordinates(result.coordinates, {
                  edgePadding: { right: 80, bottom: 420, left: 80, top: 160 },
                });
              }}
            />
          )}

          {/* Markers */}
          {(() => {
            console.log("[DEBUG] Rendering markers:", { pickupCoords, dropCoords, userLocation });
            return null;
          })()}

          {/* Pickup Marker */}
          <Marker
            coordinate={pickupCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <View collapsable={false} style={styles.pickupPin}>
              <View collapsable={false} style={styles.pinInnerDot} />
            </View>
            <Callout tooltip onPress={() => router.back()}>
              <View style={styles.locationBubble}>
                <Text style={styles.locationBubbleText} numberOfLines={1}>
                  {getDisplayName(params.pickupName)}
                </Text>
                <View style={styles.editBubbleBtn}>
                  <Feather name="edit-2" size={10} color="#111827" />
                </View>
              </View>
            </Callout>
          </Marker>
          {/* Stop Markers */}
          {stops.map((stop: any, index: number) => (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={true}
            >
              <View collapsable={false} style={styles.stopPin}>
                <Text style={styles.stopPinText}>{index + 1}</Text>
              </View>
              <Callout tooltip>
                <View style={styles.locationBubble}>
                  <Text style={styles.locationBubbleText} numberOfLines={1}>
                    {getDisplayName(stop.name)}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}

          {/* Drop Marker */}
          <Marker
            coordinate={dropCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <View collapsable={false} style={styles.dropPin}>
              <View collapsable={false} style={styles.pinInnerDot} />
            </View>
            <Callout tooltip onPress={() => router.back()}>
              <View style={styles.locationBubble}>
                <Text style={styles.locationBubbleText} numberOfLines={1}>
                  {getDisplayName(params.dropName)}
                </Text>
                <View style={styles.editBubbleBtn}>
                  <Feather name="edit-2" size={10} color="#111827" />
                </View>
              </View>
            </Callout>
          </Marker>

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={true}
            >
              <View collapsable={false} style={styles.userPin}>
                <View collapsable={false} style={styles.pinInnerDot} />
              </View>
              <Callout tooltip>
                <View style={styles.locationBubble}>
                  <Text style={styles.locationBubbleText}>My Location</Text>
                </View>
              </Callout>
            </Marker>
          )}
        </MapView>

        {/* ── Floating controls ────────────────────────────────────────────── */}
        <View style={[styles.mapOverlay, { top: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.rightFloatingBtns}>
            <View style={styles.toolGroup}>
              <TouchableOpacity
                style={styles.toolCircleBtn}
                onPress={handleShareRoute}
              >
                <Ionicons name="share-social-outline" size={18} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolCircleBtn}
                onPress={handleRecenter}
              >
                <Ionicons name="locate" size={18} color="#000" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.addStopBubble}
              onPress={handleAddStopFromMap}
            >
              <Ionicons name="add" size={16} color="#000" />
              <Text style={styles.addStopBubbleText}>Add stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── Bottom panel ─────────────────────────────────────────────────── */}
      <View style={styles.selectionPanel}>
        <View style={styles.handle} />
        <Text style={styles.panelTitle}>Choose a trip</Text>

        <ScrollView
          style={styles.rideOptionsScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {displayRideGroups.map((group, groupIdx) => (
            <View key={groupIdx} style={styles.rideGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.rideOption,
                    selectedRide.id === option.id && styles.rideOptionSelected,
                  ]}
                  onPress={() => setSelectedRide(option)}
                >
                  <View style={styles.rideImageContainer}>
                    <Image
                      source={option.image}
                      style={styles.rideImage}
                      resizeMode="contain"
                    />
                    {option.hasWaitIcon && (
                      <View style={styles.waitBadge}>
                        <Ionicons name="time" size={10} color="#fff" />
                      </View>
                    )}
                    {option.hasPriorityIcon && (
                      <View style={styles.priorityBadge}>
                        <Ionicons name="flash" size={10} color="#000" />
                      </View>
                    )}
                  </View>

                  <View style={styles.rideInfo}>
                    <View style={styles.rideTitleRow}>
                      <Text style={styles.rideName}>{option.name}</Text>
                      <View style={styles.capacityBox}>
                        <Ionicons name="person" size={10} color={colors.text} />
                        <Text style={styles.capacityText}>{option.capacity}</Text>
                      </View>
                    </View>
                    <Text style={styles.rideMeta}>
                      {option.time} {option.eta ? `· ${option.eta}` : ""}
                    </Text>
                    <Text style={styles.rideDesc}>{option.description}</Text>
                    {option.badge && (
                      <View style={styles.badgeRow}>
                        <View style={styles.promoBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#000" />
                          <Text style={styles.promoBadgeText}>{option.badge}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <Text style={styles.ridePrice}>{option.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
         

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() =>
                router.push({
                  pathname: "/pickup-confirmation",
                  params: {
                    serviceId: params.serviceId,
                    rideId: selectedRide.id,
                    rideName: selectedRide.name,
                    ridePrice: selectedRide.price,
                    pickupName: params.pickupName,
                    dropName: params.dropName,
                    pickupLat: params.pickupLat,
                    pickupLng: params.pickupLng,
                    dropLat: params.dropLat,
                    dropLng: params.dropLng,
                    stops: params.stops,
                    estimatedMinutes: fareEstimate?.estimatedMinutes?.toString() || "",
                    distanceInKm: fareEstimate?.distanceInKm?.toString() || "",
                    fareTotal: backendFare?.toString() || "",
                  },
                })
              }
            >
              <Text style={styles.bookBtnText}>
                {fareLoading ? "Loading fare..." : `Choose ${selectedRide.name}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.calendarBtn}>
              <Feather name="calendar" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Screen styles ─────────────────────────────────────────────────────────
const createStyles = (colors: typeof Colors.light, insets: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    mapContainer: { flex: 1 },
    mapOverlay: {
      position: "absolute",
      left: 20,
      right: 20,
      zIndex: 10,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    backCircleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    rightFloatingBtns: { alignItems: "flex-end", gap: 12 },
    toolGroup: { gap: 8 },
    toolCircleBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    addStopBubble: {
      backgroundColor: "#fff",
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      gap: 6,
    },
    addStopBubbleText: { fontSize: 14, fontWeight: "800", color: "#000" },
    selectionPanel: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 20,
      height: height * 0.52,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 8,
    },
    panelTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 10,
    },
    rideOptionsScroll: { flex: 1 },
    rideGroup: { marginBottom: 16, paddingHorizontal: 16 },
    groupTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    rideOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 14,
      marginBottom: 6,
      gap: 12,
      borderWidth: 2,
      borderColor: "transparent",
    },
    rideOptionSelected: {
      borderColor: "#000",
    },
    rideImageContainer: {
      width: 50,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    rideImage: { width: "100%", height: "100%" },
    waitBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#000",
      alignItems: "center",
      justifyContent: "center",
    },
    priorityBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#000",
    },
    rideInfo: { flex: 1, gap: 1 },
    rideTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    rideName: { fontSize: 15, fontWeight: "700", color: colors.text },
    capacityBox: { flexDirection: "row", alignItems: "center", gap: 3 },
    capacityText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    rideMeta: { fontSize: 13, color: colors.text, fontWeight: "500" },
    rideDesc: { fontSize: 12, color: colors.textSecondary },
    badgeRow: { flexDirection: "row", marginTop: 3 },
    promoBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F3F4F6",
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 10,
      gap: 3,
    },
    promoBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#000",
    },
    ridePrice: { fontSize: 16, fontWeight: "800", color: colors.text },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    paymentMethodCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      marginBottom: 8,
    },
    paymentMethodLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    mastercardIcon: { flexDirection: "row", alignItems: "center" },
    mcCircle: { width: 12, height: 12, borderRadius: 6 },
    paymentMethodText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    bookBtn: {
      flex: 1,
      backgroundColor: "#000",
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
    },
    bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    calendarBtn: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: "#F3F4F6",
      alignItems: "center",
      justifyContent: "center",
    },

    markerContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 190,
    },
    locationBubble: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      paddingVertical: 6,
      paddingLeft: 12,
      paddingRight: 8,
      borderRadius: 10,
      minWidth: 100,
      maxWidth: 160,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
      marginBottom: 10,
    },
    locationBubbleText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: "#111827",
    },
    editBubbleBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#EEF2FF",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 6,
    },
    pickupPin: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#ef4444",
      borderWidth: 3,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    dropPin: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#22c55e",
      borderWidth: 3,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    userPin: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#3b82f6",
      borderWidth: 3,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    pinInnerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#fff",
    },
    stopPin: {
      width: 18,
      height: 18,
      backgroundColor: "#000",
      transform: [{ rotate: "45deg" }],
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    stopPinText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "900",
      transform: [{ rotate: "-45deg" }],
    },
  });
