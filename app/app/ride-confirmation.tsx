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
  Modal,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { useDeliveryStore } from "@/contexts/deliveryStore";

const { width, height } = Dimensions.get("window");
const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const VEHICLE_BIKE_3D = require("@/assets/images/services/scooter_blue_top_view.png");
const VEHICLE_AUTO_3D = require("@/assets/images/services/auto_top_view.png");
const VEHICLE_CAB_3D = require("@/assets/images/services/cab.png");

const isValidCoordinate = (coordinate: { latitude: number; longitude: number }) =>
  Number.isFinite(coordinate.latitude) &&
  Number.isFinite(coordinate.longitude) &&
  Math.abs(coordinate.latitude) <= 90 &&
  Math.abs(coordinate.longitude) <= 180 &&
  !(coordinate.latitude === 0 && coordinate.longitude === 0);

type FareEstimate = {
  distanceInKm: number;
  estimatedMinutes: number;
  fareBreakdown: {
    total: number;
  };
};

type RouteOptimizeResponse = {
  polyline?: string;
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
    bookingForType?: string;
    riderContact?: string;
  }>();

  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(
    () => createStyles(colors, insets),
    [theme, insets]
  );
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [fareLoading, setFareLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reserveDate, setReserveDate] = useState<Date>(new Date());

  const getInitialTimeParts = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    let hourVal = now.getHours();
    const ampmVal = hourVal >= 12 ? "PM" : "AM";
    hourVal = hourVal % 12;
    hourVal = hourVal ? hourVal : 12;
    
    let minVal = Math.round(now.getMinutes() / 5) * 5;
    if (minVal >= 60) minVal = 0;
    const minStr = String(minVal).padStart(2, "0");
    
    return {
      hour: String(hourVal),
      minute: minStr,
      ampm: ampmVal
    };
  };

  const initialTime = React.useMemo(() => getInitialTimeParts(), []);
  const [reserveHour, setReserveHour] = useState<string>(initialTime.hour);
  const [reserveMinute, setReserveMinute] = useState<string>(initialTime.minute);
  const [reserveAmpm, setReserveAmpm] = useState<string>(initialTime.ampm);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reservedOrderDetails, setReservedOrderDetails] = useState<any>(null);

  const dateOptions = React.useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const serviceType = normalizeServiceType(params.serviceId);

  const pickupCoords = React.useMemo(
    () => ({
      latitude: parseFloat(params.pickupLat || "0"),
      longitude: parseFloat(params.pickupLng || "0"),
    }),
    [params.pickupLat, params.pickupLng]
  );

  const dropCoords = React.useMemo(
    () => ({
      latitude: parseFloat(params.dropLat || "0"),
      longitude: parseFloat(params.dropLng || "0"),
    }),
    [params.dropLat, params.dropLng]
  );

  React.useEffect(() => {
    if (params.serviceId) {
      useDeliveryStore.getState().setServiceType(params.serviceId);
    }
  }, [params.serviceId]);

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
      const isCabPrime = params.serviceId === "cab-prime";
      const cabName = isCabPrime ? "Cab Prime" : "Cab";
      const title = isCabPrime ? "Prime cabs for you" : "Cabs for you";
      const description = isCabPrime ? "Premium cab ride" : "Affordable cab ride";
      const reserveDescription = isCabPrime
        ? "Reserve a premium cab for later"
        : "Reserve a cab for later";

      return [
        {
          title,
          options: [
            {
              id: isCabPrime ? "cab-prime-ride-4" : "cab-economy-ride-4",
              name: `${cabName} Ride`,
              capacity: 4,
              price: isCabPrime ? "₹245.00" : "₹181.50",
              time: "2:00pm",
              eta: "9 min",
              description,
              image: require("@/assets/images/services/cab.png"),
            },
            {
              id: isCabPrime ? "cab-prime-reserve-4" : "cab-economy-reserve-4",
              name: `${cabName} Reserve`,
              capacity: 4,
              price: isCabPrime ? "₹290.00" : "₹215.00",
              time: "2:08pm",
              eta: "12 min",
              description: reserveDescription,
              image: require("@/assets/images/services/cab.png"),
              badge: "Planned",
            },
            {
              id: isCabPrime ? "cab-prime-ride-7" : "cab-economy-ride-7",
              name: `${cabName} Ride`,
              capacity: 7,
              price: isCabPrime ? "₹365.00" : "₹260.00",
              time: "1:59pm",
              eta: "11 min",
              description: `${description} for larger groups`,
              image: require("@/assets/images/services/cab.png"),
            },
            {
              id: isCabPrime ? "cab-prime-reserve-7" : "cab-economy-reserve-7",
              name: `${cabName} Reserve`,
              capacity: 7,
              price: isCabPrime ? "₹420.00" : "₹305.00",
              time: "1:53pm",
              eta: "15 min",
              description: `${reserveDescription} for larger groups`,
              image: require("@/assets/images/services/cab.png"),
              badge: "Planned",
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
        "cab-economy-reserve-4": 1.18,
        "cab-economy-ride-7": 1.35,
        "cab-economy-reserve-7": 1.55,
        "cab-prime-ride-4": 1.25,
        "cab-prime-reserve-4": 1.45,
        "cab-prime-ride-7": 1.65,
        "cab-prime-reserve-7": 1.9,
      };
      return getBackendPrice(fallback, multipliers[id] || 1);
    };

    return RIDE_GROUPS.map((group) => ({
      ...group,
      options: group.options.map((option) => {
        const isReserve = option.id.includes("reserve");
        const formattedTime = isReserve && selectedDateTime
          ? `${selectedDateTime.toLocaleDateString([], { month: "short", day: "numeric" })} · ${selectedDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : option.time;

        return {
          ...option,
          price: priceFor(option.id, option.price),
          eta: isReserve ? undefined : (backendEta || option.eta),
          time: formattedTime,
        };
      }),
    }));
  }, [RIDE_GROUPS, backendEta, backendFare, selectedDateTime]);

  const [selectedRideId, setSelectedRideId] = useState<string>("");

  React.useEffect(() => {
    if (displayRideGroups[0]?.options[0]?.id && !selectedRideId) {
      setSelectedRideId(displayRideGroups[0].options[0].id);
    }
  }, [displayRideGroups]);

  const selectedRide = React.useMemo(() => {
    for (const group of displayRideGroups) {
      const found = group.options.find((opt) => opt.id === selectedRideId);
      if (found) return found;
    }
    return displayRideGroups[0]?.options[0] || { id: "", name: "", price: "", time: "", description: "" };
  }, [displayRideGroups, selectedRideId]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [directionsFailed, setDirectionsFailed] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
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

  const validStops = React.useMemo(
    () =>
      stops
        .map((stop: any) => ({
          ...stop,
          latitude: Number(stop.lat),
          longitude: Number(stop.lng),
        }))
        .filter((stop: any) => isValidCoordinate({ latitude: stop.latitude, longitude: stop.longitude })),
    [stops],
  );

  const pickupIsValid = isValidCoordinate(pickupCoords);
  const dropIsValid = isValidCoordinate(dropCoords);
  const tripCoordinates = React.useMemo(() => {
    if (!pickupIsValid || !dropIsValid) return [];

    return [
      pickupCoords,
      ...validStops.map((stop: any) => ({ latitude: stop.latitude, longitude: stop.longitude })),
      dropCoords,
    ];
  }, [
    pickupIsValid,
    dropIsValid,
    pickupCoords,
    dropCoords,
    validStops,
  ]);

  const fitTripToMap = React.useCallback((animated = true) => {
    if (!mapRef.current) return;
    if (!pickupIsValid || !dropIsValid) return;

    const pointsToFit = [
      pickupCoords,
      ...validStops.map((stop: any) => ({ latitude: stop.latitude, longitude: stop.longitude })),
      dropCoords,
    ];

    if (pointsToFit.length < 2) return;

    mapRef.current.fitToCoordinates(pointsToFit, {
      edgePadding: {
        top: Platform.OS === "ios" ? 110 : 90,
        right: 60,
        bottom: 330,
        left: 60,
      },
      animated,
    });
  }, [pickupCoords, dropCoords, validStops, pickupIsValid, dropIsValid]);

  const initialRegion = React.useMemo(() => {
    if (!pickupIsValid && !dropIsValid) {
      return {
        latitude: 17.0005,
        longitude: 81.7800,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (!dropIsValid) {
      return {
        ...pickupCoords,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }
    if (!pickupIsValid) {
      return {
        ...dropCoords,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }

    const minLat = Math.min(pickupCoords.latitude, dropCoords.latitude);
    const maxLat = Math.max(pickupCoords.latitude, dropCoords.latitude);
    const minLng = Math.min(pickupCoords.longitude, dropCoords.longitude);
    const maxLng = Math.max(pickupCoords.longitude, dropCoords.longitude);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDelta = Math.max((maxLat - minLat) * 1.8, 0.025);
    const lngDelta = Math.max((maxLng - minLng) * 1.8, 0.025);

    return {
      latitude: centerLat - (latDelta * 0.18),
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [pickupCoords, dropCoords, pickupIsValid, dropIsValid]);

  React.useEffect(() => {
    if (!mapReady || !pickupIsValid || !dropIsValid) return;

    fitTripToMap(false);
    const timer1 = setTimeout(() => fitTripToMap(true), 250);
    const timer2 = setTimeout(() => fitTripToMap(true), 750);
    const timer3 = setTimeout(() => fitTripToMap(true), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [fitTripToMap, mapReady, pickupIsValid, dropIsValid]);

  React.useEffect(() => {
    if (!pickupIsValid || !dropIsValid) {
      setRouteCoordinates([]);
      return;
    }

    let cancelled = false;

    const loadBackendRoute = async () => {
      try {
        const route = await customFetch<RouteOptimizeResponse>("/api/v1/routing/optimize", {
          method: "POST",
          body: JSON.stringify({
            origin: {
              latitude: pickupCoords.latitude,
              longitude: pickupCoords.longitude,
            },
            stops: [
              ...validStops.map((stop: any) => ({
                id: stop.id,
                address: stop.name || stop.address || "Stop",
                latitude: stop.latitude,
                longitude: stop.longitude,
                type: "stop",
              })),
              {
                id: "drop",
                address: params.dropName || "Drop",
                latitude: dropCoords.latitude,
                longitude: dropCoords.longitude,
                type: "drop",
              },
            ],
          }),
          responseType: "json",
        });

        const decoded = route?.polyline ? decodePolyline(route.polyline) : [];
        const hasRoadShape = decoded.length > tripCoordinates.length;
        if (!cancelled && hasRoadShape) {
          setRouteCoordinates(decoded);
        } else if (!cancelled) {
          setRouteCoordinates([]);
        }
      } catch (error) {
        console.warn("Backend route fetch failed:", error);
        if (!cancelled) setRouteCoordinates([]);
      }
    };

    loadBackendRoute();

    return () => {
      cancelled = true;
    };
  }, [
    pickupIsValid,
    dropIsValid,
    pickupCoords.latitude,
    pickupCoords.longitude,
    dropCoords.latitude,
    dropCoords.longitude,
    params.dropName,
    validStops,
    tripCoordinates.length,
  ]);

  const selectedVehicleType = React.useMemo(() => {
    if (!selectedRideId) {
      return serviceType === "auto" ? "auto" : "bike";
    }
    const idLower = selectedRideId.toLowerCase();
    if (idLower.includes("auto")) return "auto";
    return "bike";
  }, [selectedRideId, serviceType]);

  React.useEffect(() => {
    const loadNearbyDrivers = async () => {
      if (!Number.isFinite(pickupCoords.latitude) || !Number.isFinite(pickupCoords.longitude)) return;
      try {
        const drivers = await customFetch<any[]>(
          `/api/v1/drivers/nearby?latitude=${pickupCoords.latitude}&longitude=${pickupCoords.longitude}&radius=50000`,
          { responseType: "json" },
        );
        let mapped = (drivers || []).map((driver: any) => ({
          id: driver._id || driver.id,
          vehicleType: driver.vehicleType || selectedVehicleType || "bike",
          lat: driver.currentLocation?.coordinates?.[1] || driver.user?.addresses?.[0]?.location?.coordinates?.[1],
          lng: driver.currentLocation?.coordinates?.[0] || driver.user?.addresses?.[0]?.location?.coordinates?.[0],
        })).filter((driver: any) => Number.isFinite(driver.lat) && Number.isFinite(driver.lng));

        if (mapped.length === 0) {
          const baseLat = pickupCoords.latitude;
          const baseLng = pickupCoords.longitude;
          const targetType = selectedVehicleType === "auto" ? "auto" : "bike";
          mapped = [
            { id: "drv-1", vehicleType: targetType, lat: baseLat + 0.0032, lng: baseLng + 0.0021 },
            { id: "drv-2", vehicleType: targetType, lat: baseLat - 0.0025, lng: baseLng + 0.0038 },
            { id: "drv-3", vehicleType: targetType, lat: baseLat + 0.0041, lng: baseLng - 0.0028 },
            { id: "drv-4", vehicleType: targetType, lat: baseLat - 0.0031, lng: baseLng - 0.0019 },
          ];
        }

        setNearbyDrivers(mapped);
      } catch (error) {
        console.warn("Unable to load nearby online drivers", error);
        const baseLat = pickupCoords.latitude;
        const baseLng = pickupCoords.longitude;
        const targetType = selectedVehicleType === "auto" ? "auto" : "bike";
        setNearbyDrivers([
          { id: "drv-1", vehicleType: targetType, lat: baseLat + 0.0032, lng: baseLng + 0.0021 },
          { id: "drv-2", vehicleType: targetType, lat: baseLat - 0.0025, lng: baseLng + 0.0038 },
          { id: "drv-3", vehicleType: targetType, lat: baseLat + 0.0041, lng: baseLng - 0.0028 },
          { id: "drv-4", vehicleType: targetType, lat: baseLat - 0.0031, lng: baseLng - 0.0019 },
        ]);
      }
    };

    loadNearbyDrivers();
    const interval = setInterval(loadNearbyDrivers, 12000);
    return () => clearInterval(interval);
  }, [pickupCoords.latitude, pickupCoords.longitude, selectedVehicleType]);

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

  const [isAddStopExpanded, setIsAddStopExpanded] = useState(false);
  const addStopTimerRef = useRef<any>(null);

  const handleAddStopPress = () => {
    if (!isAddStopExpanded) {
      if (Platform.OS === "ios" || Platform.OS === "android") {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setIsAddStopExpanded(true);

      if (addStopTimerRef.current) {
        clearTimeout(addStopTimerRef.current);
      }

      addStopTimerRef.current = setTimeout(() => {
        if (Platform.OS === "ios" || Platform.OS === "android") {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setIsAddStopExpanded(false);
        addStopTimerRef.current = null;
      }, 5000);
    } else {
      if (addStopTimerRef.current) {
        clearTimeout(addStopTimerRef.current);
        addStopTimerRef.current = null;
      }
      handleAddStopFromMap();
    }
  };

  React.useEffect(() => {
    return () => {
      if (addStopTimerRef.current) {
        clearTimeout(addStopTimerRef.current);
      }
    };
  }, []);

  const handleRecenter = async () => {
    if (pickupIsValid && dropIsValid) {
      fitTripToMap(true);
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coords);
          mapRef.current?.animateToRegion(
            { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
            1000
          );
        }
      } catch {
        // fallback
      }
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
          initialRegion={initialRegion}
          zoomEnabled
          scrollEnabled
          showsUserLocation={false}
          showsMyLocationButton={false}
          onMapReady={() => setMapReady(true)}
        >
          {/* Route */}
          {routeCoordinates.length > tripCoordinates.length && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#111827"
            />
          )}

          {GOOGLE_MAPS_APIKEY && pickupIsValid && dropIsValid && (
            <MapViewDirections
              origin={pickupCoords}
              destination={dropCoords}
              waypoints={validStops.map((s: any) => ({ latitude: s.latitude, longitude: s.longitude }))}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor="#111827"
              optimizeWaypoints
              onReady={(result) => {
                setDirectionsFailed(false);
                fitTripToMap(true);
              }}
              onError={(errorMessage) => {
                console.warn("Map directions failed:", errorMessage);
                setDirectionsFailed(true);
                fitTripToMap(true);
              }}
            />
          )}

          {/* Markers */}
          {nearbyDrivers.map((driver) => {
            const vehicleType = (driver.vehicleType || driver.vehicle || "bike").toLowerCase();
            
            // 1. Do not display car/cab markers
            if (vehicleType.includes("car") || vehicleType.includes("cab") || vehicleType.includes("prime")) {
              return null;
            }

            const isAutoVehicle = vehicleType.includes("auto") || vehicleType.includes("rickshaw");
            const isAutoSelected = selectedVehicleType === "auto";

            // 2. Display bike if bike is selected, auto if auto is selected
            if (isAutoSelected && !isAutoVehicle) return null;
            if (!isAutoSelected && isAutoVehicle) return null;

            const markerImage = isAutoVehicle ? VEHICLE_AUTO_3D : VEHICLE_BIKE_3D;

            return (
              <Marker
                key={driver.id}
                coordinate={{ latitude: Number(driver.lat), longitude: Number(driver.lng) }}
                image={markerImage}
                anchor={{ x: 0.5, y: 0.5 }}
              />
            );
          })}

          {/* Pickup Marker */}
          {pickupIsValid && (
            <Marker
              coordinate={pickupCoords}
              anchor={{ x: 0.5, y: 1.0 }}
              tracksViewChanges={true}
            >
              <View collapsable={false} style={styles.mapPinContainer}>
                <Ionicons name="location" size={36} color="#16A34A" />
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
          )}

          {/* Stop Markers */}
          {validStops.map((stop: any, index: number) => (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
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
          {dropIsValid && (
            <Marker
              coordinate={dropCoords}
              anchor={{ x: 0.5, y: 1.0 }}
              tracksViewChanges={true}
            >
              <View collapsable={false} style={styles.mapPinContainer}>
                <Ionicons name="location" size={36} color="#EF4444" />
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
          )}

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
              <TouchableOpacity
                style={isAddStopExpanded ? styles.addStopBubble : styles.toolCircleBtn}
                onPress={handleAddStopPress}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={isAddStopExpanded ? 16 : 20} color="#000" />
                {isAddStopExpanded && (
                  <Text style={styles.addStopBubbleText}>Add stop</Text>
                )}
              </TouchableOpacity>
            </View>
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
                    selectedRideId === option.id && styles.rideOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedRideId(option.id);
                    if (option.id.includes("reserve")) {
                      setShowDatePicker(true);
                    }
                  }}
                >
                  <View style={styles.rideImageContainer}>
                    <Image
                      source={option.image}
                      style={styles.rideImage}
                      resizeMode="contain"
                    />
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
              style={[styles.bookBtn, fareLoading && { opacity: 0.7 }]}
              disabled={fareLoading}
              onPress={async () => {
                if (fareLoading) return;
                
                const isReserved = selectedRide.id.includes("reserve");
                if (isReserved && !selectedDateTime) {
                  setShowDatePicker(true);
                  return;
                }

                setFareLoading(true);
                try {
                  const orderStops = [
                    { address: params.pickupName, latitude: pickupCoords.latitude, longitude: pickupCoords.longitude, type: "pickup" },
                    ...stops.map((s: any) => ({ address: s.name, latitude: s.lat, longitude: s.lng, type: "stop" })),
                    { address: params.dropName, latitude: dropCoords.latitude, longitude: dropCoords.longitude, type: "drop" }
                  ];
                  const res = await customFetch<{ _id: string }>("/api/v1/orders", {
                    method: "POST",
                    body: JSON.stringify({
                      stops: orderStops,
                      serviceType: serviceType,
                      isReserved,
                      reservedAt: isReserved ? selectedDateTime?.toISOString() : undefined,
                      bookingFor: {
                        type: params.bookingForType === "someone_else" ? "someone_else" : "myself",
                        contactNumber: params.bookingForType === "someone_else" ? params.riderContact : undefined,
                      },
                    })
                  });

                  router.push({
                    pathname: "/finding-driver",
                    params: { 
                      orderId: res._id,
                      isReserved: isReserved ? "true" : "false",
                      dateTimeStr: selectedDateTime ? selectedDateTime.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""
                    }
                  });
                } catch (e: any) {
                  Alert.alert("Booking Failed", e.message);
                } finally {
                  setFareLoading(false);
                }
              }}
            >
              {fareLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.bookBtnText}>
                  {selectedRide.id.includes("reserve")
                    ? (selectedDateTime ? `Confirm ${selectedRide.name}` : `Schedule ${selectedRide.name}`)
                    : `Choose ${selectedRide.name}`}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.calendarBtn}
              onPress={() => {
                const reserveOption = displayRideGroups[0].options.find(
                  (opt) => opt.id.includes("reserve") && opt.capacity === selectedRide.capacity
                );
                if (reserveOption) {
                  setSelectedRideId(reserveOption.id);
                }
                setShowDatePicker(true);
              }}
            >
              <Feather name="calendar" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── Custom Premium Date-Time Picker Modal ─── */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sheetScrim}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={styles.datePickerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.datePickerTitle}>Schedule a ride</Text>
            <Text style={styles.datePickerSub}>Select your preferred pickup day and time</Text>

            {/* Date Selector Row */}
            <Text style={styles.pickerSectionLabel}>Select Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.datesContainer}
              contentContainerStyle={{ gap: 10, paddingRight: 20 }}
            >
              {dateOptions.map((date: Date, idx: number) => {
                const isSelected = reserveDate.toDateString() === date.toDateString();
                const dayName = idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : date.toLocaleDateString([], { weekday: 'short' });
                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                    onPress={() => setReserveDate(date)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dateDayText, isSelected && styles.dateDayTextActive]}>{dayName}</Text>
                    <Text style={[styles.dateValText, isSelected && styles.dateValTextActive]}>{dateStr}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Hour Selector */}
            <Text style={styles.pickerSectionLabel}>Hour</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.timeScroll}
              contentContainerStyle={{ gap: 8 }}
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((hr) => {
                const isSelected = reserveHour === hr;
                return (
                  <TouchableOpacity
                    key={hr}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                    onPress={() => setReserveHour(hr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{hr}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Minute Selector */}
            <Text style={styles.pickerSectionLabel}>Minute</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.timeScroll}
              contentContainerStyle={{ gap: 8 }}
            >
              {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((min) => {
                const isSelected = reserveMinute === min;
                return (
                  <TouchableOpacity
                    key={min}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                    onPress={() => setReserveMinute(min)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{min}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* AM/PM Selector */}
            <View style={styles.ampmRow}>
              {["AM", "PM"].map((period) => {
                const isSelected = reserveAmpm === period;
                return (
                  <TouchableOpacity
                    key={period}
                    style={[styles.ampmBtn, isSelected && styles.ampmBtnActive]}
                    onPress={() => setReserveAmpm(period)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.ampmBtnText, isSelected && styles.ampmBtnTextActive]}>{period}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmTimeBtn}
              onPress={() => {
                const finalD = new Date(reserveDate);
                let hr = parseInt(reserveHour);
                if (reserveAmpm === "PM" && hr < 12) hr += 12;
                if (reserveAmpm === "AM" && hr === 12) hr = 0;
                finalD.setHours(hr, parseInt(reserveMinute), 0, 0);
                setSelectedDateTime(finalD);
                setShowDatePicker(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.confirmTimeBtnText}>Set Pickup Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Success Modal for Reservations ─── */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace("/(tabs)");
        }}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalBox}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
            </View>

            <Text style={styles.successModalTitle}>Reservation Confirmed!</Text>
            <Text style={styles.successModalSub}>Your ride has been scheduled successfully.</Text>

            {reservedOrderDetails && (
              <View style={styles.detailsCard}>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Service</Text>
                  <Text style={styles.detailsValue}>{reservedOrderDetails.rideName}</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Pickup Time</Text>
                  <Text style={[styles.detailsValue, { color: colors.primary }]}>{reservedOrderDetails.dateTimeStr}</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Est. Price</Text>
                  <Text style={styles.detailsValue}>{reservedOrderDetails.price}</Text>
                </View>
                <View style={styles.addressSection}>
                  <View style={styles.addressLineItem}>
                    <View style={[styles.addrDot, { backgroundColor: "#22c55e" }]} />
                    <Text style={styles.addressCardText} numberOfLines={1}>
                      {getDisplayName(reservedOrderDetails.pickupName)}
                    </Text>
                  </View>
                  <View style={styles.addrLineConnector} />
                  <View style={styles.addressLineItem}>
                    <View style={[styles.addrDot, { backgroundColor: "#ef4444" }]} />
                    <Text style={styles.addressCardText} numberOfLines={1}>
                      {getDisplayName(reservedOrderDetails.dropName)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace("/(tabs)");
                }}
              >
                <Text style={styles.doneBtnText}>Back to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewOrdersBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace("/(tabs)/orders");
                }}
              >
                <Text style={styles.viewOrdersBtnText}>View My Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Screen styles ─────────────────────────────────────────────────────────
function decodePolyline(encoded: string) {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

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
    toolGroup: { alignItems: "flex-end", gap: 8 },
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
      height: 40,
      backgroundColor: "#fff",
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
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
    ridePrice: { fontSize: 14, fontWeight: "800", color: colors.text },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
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

    // Custom Date-Picker Modal
    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.68)",
    },
    sheetHandle: {
      alignSelf: "center",
      width: 46,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border || "#E2E8F0",
      marginBottom: 20,
    },
    datePickerSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 16,
      paddingHorizontal: 20,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 16,
    },
    datePickerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    datePickerSub: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 20,
      fontWeight: "500",
    },
    pickerSectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },
    datesContainer: {
      marginBottom: 16,
    },
    dateCard: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary || "#F1F5F9",
      alignItems: "center",
      minWidth: 80,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    dateCardActive: {
      backgroundColor: colors.primary + "15",
      borderColor: colors.primary,
    },
    dateDayText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 2,
    },
    dateDayTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },
    dateValText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    dateValTextActive: {
      color: colors.primary,
    },
    timeScroll: {
      marginBottom: 16,
    },
    timeChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary || "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    timeChipActive: {
      backgroundColor: colors.primary + "15",
      borderColor: colors.primary,
    },
    timeChipText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    timeChipTextActive: {
      color: colors.primary,
    },
    ampmRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    ampmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary || "#F1F5F9",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    ampmBtnActive: {
      backgroundColor: colors.primary + "15",
      borderColor: colors.primary,
    },
    ampmBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    ampmBtnTextActive: {
      color: colors.primary,
    },
    confirmTimeBtn: {
      backgroundColor: colors.primary || "#000",
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    confirmTimeBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },

    // Success Modal
    successModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.75)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    successModalBox: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      width: "100%",
      maxWidth: 360,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    successIconOuter: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "#22c55e15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    successIconInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "#22c55e",
      alignItems: "center",
      justifyContent: "center",
    },
    successModalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 6,
    },
    successModalSub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 18,
    },
    detailsCard: {
      backgroundColor: colors.surfaceSecondary || "#F8FAFC",
      borderRadius: 16,
      padding: 16,
      width: "100%",
      gap: 10,
      marginBottom: 24,
    },
    detailsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    detailsLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    detailsValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "700",
    },
    addressSection: {
      borderTopWidth: 1,
      borderTopColor: colors.borderLight || "#E2E8F0",
      paddingTop: 10,
      marginTop: 4,
      gap: 6,
    },
    addressLineItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    addrDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    addressCardText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "500",
      flex: 1,
    },
    addrLineConnector: {
      width: 1,
      height: 8,
      backgroundColor: colors.border || "#CBD5E1",
      marginLeft: 2.5,
    },
    doneBtn: {
      backgroundColor: colors.primary || "#000",
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    doneBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    viewOrdersBtn: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      borderWidth: 1.5,
      borderColor: colors.border || "#E2E8F0",
    },
    viewOrdersBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    vehicleMarker: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: colors.shadow || "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 4,
    },
    mapPinContainer: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
  });
