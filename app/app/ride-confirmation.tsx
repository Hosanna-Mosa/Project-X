import React, { useState, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Platform,
  Share,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { useDeliveryStore } from "@/contexts/deliveryStore";

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const VEHICLE_BIKE_3D = require("@/assets/images/services/scooter_blue_top_view_2.png");
const VEHICLE_AUTO_3D = require("@/assets/images/services/auto_top_view.png");

const isValidCoordinate = (coordinate: { latitude: number; longitude: number }) =>
  Number.isFinite(coordinate.latitude) &&
  Number.isFinite(coordinate.longitude) &&
  Math.abs(coordinate.latitude) <= 90 &&
  Math.abs(coordinate.longitude) <= 180 &&
  !(coordinate.latitude === 0 && coordinate.longitude === 0);

// Only Bike and Auto are enabled anywhere in the app today (All Services
// keeps Cab Economy/Prime commented out — a pre-existing decision, not one
// made during this redesign), so those are the only two tiers this screen
// can honestly compare fares for.
const ENABLED_TIERS: { id: "bike" | "auto"; name: string; icon: string; capacity: string }[] = [
  { id: "bike", name: "Bike", icon: "🏍", capacity: "1 seat" },
  { id: "auto", name: "Auto", icon: "🛺", capacity: "3 seats" },
];

type FareEstimate = { distanceInKm: number; estimatedMinutes: number; fareBreakdown: { total: number } };
type RouteOptimizeResponse = { polyline?: string };

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
  const tokens = designTokens[theme];
  const accent = tokens.services.ride;
  const styles = useMemo(() => createStyles(tokens, accent, insets), [theme, insets]);

  const [selectedTier, setSelectedTier] = useState<"bike" | "auto">(
    params.serviceId === "auto" ? "auto" : "bike"
  );
  const [tierFares, setTierFares] = useState<Record<string, FareEstimate | null>>({});
  const [loadingFares, setLoadingFares] = useState(false);
  const [booking, setBooking] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reserveDate, setReserveDate] = useState<Date>(new Date());
  const getInitialTimeParts = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    let hourVal = now.getHours();
    const ampmVal = hourVal >= 12 ? "PM" : "AM";
    hourVal = hourVal % 12 || 12;
    let minVal = Math.round(now.getMinutes() / 5) * 5;
    if (minVal >= 60) minVal = 0;
    return { hour: String(hourVal), minute: String(minVal).padStart(2, "0"), ampm: ampmVal };
  };
  const initialTime = useMemo(() => getInitialTimeParts(), []);
  const [reserveHour, setReserveHour] = useState(initialTime.hour);
  const [reserveMinute, setReserveMinute] = useState(initialTime.minute);
  const [reserveAmpm, setReserveAmpm] = useState(initialTime.ampm);

  const [confirmedReservation, setConfirmedReservation] = useState<any>(null);

  const dateOptions = useMemo(() => {
    const arr: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const pickupCoords = useMemo(
    () => ({ latitude: parseFloat(params.pickupLat || "0"), longitude: parseFloat(params.pickupLng || "0") }),
    [params.pickupLat, params.pickupLng]
  );
  const dropCoords = useMemo(
    () => ({ latitude: parseFloat(params.dropLat || "0"), longitude: parseFloat(params.dropLng || "0") }),
    [params.dropLat, params.dropLng]
  );

  React.useEffect(() => {
    if (params.serviceId) useDeliveryStore.getState().setServiceType(params.serviceId);
  }, [params.serviceId]);

  React.useEffect(() => {
    const canEstimate = isValidCoordinate(pickupCoords) && isValidCoordinate(dropCoords);
    if (!canEstimate) return;

    const loadFares = async () => {
      setLoadingFares(true);
      try {
        const results = await Promise.all(
          ENABLED_TIERS.map(async (tier) => {
            try {
              const query = new URLSearchParams({
                pickupLat: String(pickupCoords.latitude),
                pickupLng: String(pickupCoords.longitude),
                dropLat: String(dropCoords.latitude),
                dropLng: String(dropCoords.longitude),
                serviceType: tier.id,
              });
              const estimate = await customFetch<FareEstimate>(`/api/v1/orders/estimate-fare?${query}`, { responseType: "json" });
              return [tier.id, estimate] as const;
            } catch {
              return [tier.id, null] as const;
            }
          })
        );
        setTierFares(Object.fromEntries(results));
      } finally {
        setLoadingFares(false);
      }
    };

    loadFares();
  }, [pickupCoords.latitude, pickupCoords.longitude, dropCoords.latitude, dropCoords.longitude]);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const mapRef = useRef<MapView>(null);

  const stops = useMemo(() => {
    if (!params.stops) return [];
    try {
      return JSON.parse(params.stops);
    } catch {
      return [];
    }
  }, [params.stops]);

  const validStops = useMemo(
    () =>
      stops
        .map((stop: any) => ({ ...stop, latitude: Number(stop.lat), longitude: Number(stop.lng) }))
        .filter((stop: any) => isValidCoordinate({ latitude: stop.latitude, longitude: stop.longitude })),
    [stops]
  );

  const pickupIsValid = isValidCoordinate(pickupCoords);
  const dropIsValid = isValidCoordinate(dropCoords);
  const tripCoordinates = useMemo(() => {
    if (!pickupIsValid || !dropIsValid) return [];
    return [pickupCoords, ...validStops.map((s: any) => ({ latitude: s.latitude, longitude: s.longitude })), dropCoords];
  }, [pickupIsValid, dropIsValid, pickupCoords, dropCoords, validStops]);

  const fitTripToMap = React.useCallback(
    (animated = true) => {
      if (!mapRef.current || !pickupIsValid || !dropIsValid) return;
      const pointsToFit = [pickupCoords, ...validStops.map((s: any) => ({ latitude: s.latitude, longitude: s.longitude })), dropCoords];
      if (pointsToFit.length < 2) return;
      mapRef.current.fitToCoordinates(pointsToFit, {
        edgePadding: { top: Platform.OS === "ios" ? 110 : 90, right: 60, bottom: 60, left: 60 },
        animated,
      });
    },
    [pickupCoords, dropCoords, validStops, pickupIsValid, dropIsValid]
  );

  const initialRegion = useMemo(() => {
    if (!pickupIsValid && !dropIsValid) return { latitude: 17.0005, longitude: 81.78, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    if (!dropIsValid) return { ...pickupCoords, latitudeDelta: 0.04, longitudeDelta: 0.04 };
    if (!pickupIsValid) return { ...dropCoords, latitudeDelta: 0.04, longitudeDelta: 0.04 };
    const minLat = Math.min(pickupCoords.latitude, dropCoords.latitude);
    const maxLat = Math.max(pickupCoords.latitude, dropCoords.latitude);
    const minLng = Math.min(pickupCoords.longitude, dropCoords.longitude);
    const maxLng = Math.max(pickupCoords.longitude, dropCoords.longitude);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 1.8, 0.025);
    const lngDelta = Math.max((maxLng - minLng) * 1.8, 0.025);
    return { latitude: centerLat - latDelta * 0.18, longitude: centerLng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
  }, [pickupCoords, dropCoords, pickupIsValid, dropIsValid]);

  React.useEffect(() => {
    if (!mapReady || !pickupIsValid || !dropIsValid) return;
    fitTripToMap(false);
    const t1 = setTimeout(() => fitTripToMap(true), 250);
    const t2 = setTimeout(() => fitTripToMap(true), 750);
    const t3 = setTimeout(() => fitTripToMap(true), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [fitTripToMap, mapReady, pickupIsValid, dropIsValid]);

  React.useEffect(() => {
    if (!pickupIsValid || !dropIsValid) { setRouteCoordinates([]); return; }
    let cancelled = false;
    const loadBackendRoute = async () => {
      try {
        const route = await customFetch<RouteOptimizeResponse>("/api/v1/routing/optimize", {
          method: "POST",
          body: JSON.stringify({
            origin: { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude },
            stops: [
              ...validStops.map((s: any) => ({ id: s.id, address: s.name || s.address || "Stop", latitude: s.latitude, longitude: s.longitude, type: "stop" })),
              { id: "drop", address: params.dropName || "Drop", latitude: dropCoords.latitude, longitude: dropCoords.longitude, type: "drop" },
            ],
          }),
          responseType: "json",
        });
        const decoded = route?.polyline ? decodePolyline(route.polyline) : [];
        if (!cancelled) setRouteCoordinates(decoded.length > tripCoordinates.length ? decoded : []);
      } catch (error) {
        console.warn("Backend route fetch failed:", error);
        if (!cancelled) setRouteCoordinates([]);
      }
    };
    loadBackendRoute();
    return () => { cancelled = true; };
  }, [pickupIsValid, dropIsValid, pickupCoords.latitude, pickupCoords.longitude, dropCoords.latitude, dropCoords.longitude, params.dropName, validStops, tripCoordinates.length]);

  React.useEffect(() => {
    const loadNearbyDrivers = async () => {
      if (!Number.isFinite(pickupCoords.latitude) || !Number.isFinite(pickupCoords.longitude)) return;
      try {
        const drivers = await customFetch<any[]>(
          `/api/v1/drivers/nearby?latitude=${pickupCoords.latitude}&longitude=${pickupCoords.longitude}&radius=50000`,
          { responseType: "json" }
        );
        const mapped = (drivers || [])
          .map((driver: any) => ({
            id: driver._id || driver.id,
            vehicleType: driver.vehicleType || selectedTier,
            lat: driver.currentLocation?.coordinates?.[1] || driver.user?.addresses?.[0]?.location?.coordinates?.[1],
            lng: driver.currentLocation?.coordinates?.[0] || driver.user?.addresses?.[0]?.location?.coordinates?.[0],
          }))
          .filter((d: any) => Number.isFinite(d.lat) && Number.isFinite(d.lng));
        setNearbyDrivers(mapped);
      } catch (error) {
        console.warn("Unable to load nearby online drivers", error);
      }
    };
    loadNearbyDrivers();
    const interval = setInterval(loadNearbyDrivers, 12000);
    return () => clearInterval(interval);
  }, [pickupCoords.latitude, pickupCoords.longitude, selectedTier]);

  const getDisplayName = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(",");
    return parts.length > 1 ? parts[0].trim() : addr.trim();
  };

  const handleShareRoute = async () => {
    try {
      await Share.share({ message: `I'm heading from ${params.pickupName} to ${params.dropName}. Tracking my ride!` });
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
        triggerAddStop: "true",
      },
    });
  };

  const handleRecenter = async () => {
    if (pickupIsValid && dropIsValid) {
      fitTripToMap(true);
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(coords);
          mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
        }
      } catch {}
    }
  };

  const placeOrder = async (isReserved: boolean, reservedAt?: Date) => {
    setBooking(true);
    try {
      const orderStops = [
        { address: params.pickupName, latitude: pickupCoords.latitude, longitude: pickupCoords.longitude, type: "pickup" },
        ...stops.map((s: any) => ({ address: s.name, latitude: s.lat, longitude: s.lng, type: "stop" })),
        { address: params.dropName, latitude: dropCoords.latitude, longitude: dropCoords.longitude, type: "drop" },
      ];
      const res = await customFetch<{ _id: string }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          stops: orderStops,
          serviceType: selectedTier,
          isReserved,
          reservedAt: isReserved ? reservedAt?.toISOString() : undefined,
          bookingFor: {
            type: params.bookingForType === "someone_else" ? "someone_else" : "myself",
            contactNumber: params.bookingForType === "someone_else" ? params.riderContact : undefined,
          },
        }),
      });

      if (isReserved) {
        setShowDatePicker(false);
        setConfirmedReservation({
          tierName: ENABLED_TIERS.find((t) => t.id === selectedTier)?.name,
          dateTimeStr: reservedAt?.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
          timeStr: reservedAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          fare: tierFares[selectedTier]?.fareBreakdown?.total,
          pickupName: params.pickupName,
          dropName: params.dropName,
        });
      } else {
        router.push({ pathname: "/finding-driver", params: { orderId: res._id } });
      }
    } catch (e: any) {
      Alert.alert("Booking failed", e.message);
    } finally {
      setBooking(false);
    }
  };

  if (confirmedReservation) {
    return (
      <View style={styles.root}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 150 }} showsVerticalScrollIndicator={false}>
          <View style={styles.successBlock}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={moderateScale(32)} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Reservation{"\n"}confirmed</Text>
            <Text style={styles.successSub}>We'll assign your captain at {confirmedReservation.timeStr} and notify you.</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.detailsCard}>
              <View style={styles.detailsRow}><Text style={styles.detailsLabel}>Service</Text><Text style={styles.detailsValue}>{confirmedReservation.tierName}</Text></View>
              <View style={styles.detailsRow}><Text style={styles.detailsLabel}>Pickup time</Text><Text style={styles.detailsValue}>{confirmedReservation.dateTimeStr}</Text></View>
              <View style={styles.detailsRow}><Text style={styles.detailsLabel}>Pickup</Text><Text style={styles.detailsValue} numberOfLines={1}>{getDisplayName(confirmedReservation.pickupName)}</Text></View>
              <View style={styles.detailsRow}><Text style={styles.detailsLabel}>Drop</Text><Text style={styles.detailsValue} numberOfLines={1}>{getDisplayName(confirmedReservation.dropName)}</Text></View>
              <View style={[styles.detailsRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailsLabel}>Estimated price</Text>
                <Text style={styles.detailsPrice}>{confirmedReservation.fare != null ? `₹${Math.round(confirmedReservation.fare)}` : "—"}</Text>
              </View>
            </View>
            <Text style={styles.estimateNote}>Estimated · final fare may change with route and waiting time.</Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity style={styles.footerPrimaryBtn} onPress={() => router.replace("/(tabs)/orders")}>
            <Text style={styles.footerPrimaryBtnText}>View my orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerSecondaryBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.footerSecondaryBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedFare = tierFares[selectedTier];

  return (
    <View style={styles.root}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          zoomEnabled scrollEnabled pitchEnabled rotateEnabled zoomTapEnabled
          showsUserLocation={false}
          showsMyLocationButton={false}
          onMapReady={() => setMapReady(true)}
        >
          {routeCoordinates.length > tripCoordinates.length && (
            <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor={tokens.text} />
          )}
          {GOOGLE_MAPS_APIKEY && pickupIsValid && dropIsValid && (
            <MapViewDirections
              origin={pickupCoords}
              destination={dropCoords}
              waypoints={validStops.map((s: any) => ({ latitude: s.latitude, longitude: s.longitude }))}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor={tokens.text}
              optimizeWaypoints
              onReady={() => fitTripToMap(true)}
              onError={(errorMessage) => { console.warn("Map directions failed:", errorMessage); fitTripToMap(true); }}
            />
          )}

          {nearbyDrivers.map((driver) => {
            const vehicleType = (driver.vehicleType || "bike").toLowerCase();
            const isAutoVehicle = vehicleType.includes("auto");
            if ((selectedTier === "auto") !== isAutoVehicle) return null;
            return (
              <Marker key={driver.id} coordinate={{ latitude: Number(driver.lat), longitude: Number(driver.lng) }} anchor={{ x: 0.5, y: 0.5 }}>
                <Image source={isAutoVehicle ? VEHICLE_AUTO_3D : VEHICLE_BIKE_3D} style={{ width: 40, height: 40 }} resizeMode="contain" />
              </Marker>
            );
          })}

          {pickupIsValid && (
            <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 1 }} tracksViewChanges>
              {/* A hollow ring in the ride accent color read as an unstyled
                  "blue dot" rather than a pickup pin. Proper pin shape
                  (solid head + pointed tail), bottom-aligned in its box to
                  match anchor: {y: 1} so the tail tip actually lands on the
                  coordinate instead of floating above it. */}
              <View collapsable={false} style={styles.pickupPinWrap}>
                <View style={styles.pickupPinHead}>
                  <View style={styles.pickupPinDot} />
                </View>
                <View style={styles.pickupPinTail} />
              </View>
              <Callout tooltip onPress={() => router.back()}>
                <View style={styles.locationBubble}>
                  <Text style={styles.locationBubbleText} numberOfLines={1}>{getDisplayName(params.pickupName)}</Text>
                  <View style={styles.editBubbleBtn}><Feather name="edit-2" size={10} color={tokens.text} /></View>
                </View>
              </Callout>
            </Marker>
          )}

          {validStops.map((stop: any, index: number) => (
            <Marker key={stop.id} coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges>
              <View collapsable={false} style={styles.stopPin}><Text style={styles.stopPinText}>{index + 1}</Text></View>
              <Callout tooltip><View style={styles.locationBubble}><Text style={styles.locationBubbleText} numberOfLines={1}>{getDisplayName(stop.name)}</Text></View></Callout>
            </Marker>
          ))}

          {dropIsValid && (
            <Marker coordinate={dropCoords} anchor={{ x: 0.5, y: 1 }} tracksViewChanges>
              <View collapsable={false} style={styles.mapPinContainer}>
                <View style={styles.dropSquareMarker} />
              </View>
              <Callout tooltip onPress={() => router.back()}>
                <View style={styles.locationBubble}>
                  <Text style={styles.locationBubbleText} numberOfLines={1}>{getDisplayName(params.dropName)}</Text>
                  <View style={styles.editBubbleBtn}><Feather name="edit-2" size={10} color={tokens.text} /></View>
                </View>
              </Callout>
            </Marker>
          )}

          {userLocation && (
            <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges>
              <View collapsable={false} style={styles.userPin}><View style={styles.pinInnerDot} /></View>
              <Callout tooltip><View style={styles.locationBubble}><Text style={styles.locationBubbleText}>My location</Text></View></Callout>
            </Marker>
          )}
        </MapView>

        <View style={[styles.mapOverlay, { top: Math.max(insets.top, 24) + 10 }]}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
          </TouchableOpacity>
          <View style={styles.toolGroup}>
            <TouchableOpacity style={styles.toolCircleBtn} onPress={handleShareRoute}>
              <Ionicons name="share-social-outline" size={17} color={tokens.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCircleBtn} onPress={handleRecenter}>
              <Ionicons name="locate" size={17} color={tokens.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCircleBtn} onPress={handleAddStopFromMap}>
              <Ionicons name="add" size={20} color={tokens.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.routeChip}>
          <Text style={styles.routeChipMain} numberOfLines={1}>{getDisplayName(params.pickupName)} → {getDisplayName(params.dropName)}</Text>
          {selectedFare && (
            <Text style={styles.routeChipSub}>{selectedFare.distanceInKm.toFixed(1)} km · about {selectedFare.estimatedMinutes} min</Text>
          )}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeadRow}>
          <Text style={styles.sheetTitle}>Choose a trip</Text>
          <TouchableOpacity onPress={handleAddStopFromMap}>
            <Text style={styles.addStopLink}>+ Add stop</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            {ENABLED_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              const fare = tierFares[tier.id];
              return (
                <TouchableOpacity
                  key={tier.id}
                  style={[styles.tierRow, isSelected && styles.tierRowSelected]}
                  onPress={() => setSelectedTier(tier.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.tierIconCircle}><Text style={{ fontSize: 20 }}>{tier.icon}</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <Text style={styles.tierMeta}>
                      {tier.capacity}{fare ? ` · ${fare.estimatedMinutes} min away` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {loadingFares && !fare ? (
                      <ActivityIndicator size="small" color={accent.accent} />
                    ) : (
                      <Text style={styles.tierPrice}>{fare ? `₹${Math.round(fare.fareBreakdown.total)}` : "—"}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.scheduleRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
            <View style={styles.scheduleIconCircle}><Ionicons name="time-outline" size={16} color={accent.accent} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.scheduleTitle}>Schedule a ride</Text>
              <Text style={styles.scheduleSub}>Book up to 7 days ahead</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.muted} />
          </TouchableOpacity>
          <View style={{ height: 16 }} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity
            style={[styles.bookBtn, (booking || !selectedFare) && { opacity: 0.6 }]}
            disabled={booking || !selectedFare}
            onPress={() => placeOrder(false)}
            activeOpacity={0.9}
          >
            {booking ? (
              <ActivityIndicator size="small" color={accent.on} />
            ) : (
              <>
                <Text style={styles.bookBtnText}>Book {ENABLED_TIERS.find((t) => t.id === selectedTier)?.name}</Text>
                {selectedFare && <Text style={styles.bookBtnPrice}>· ₹{Math.round(selectedFare.fareBreakdown.total)}</Text>}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetScrim} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.datePickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.datePickerTitle}>Schedule a ride</Text>
            <Text style={styles.datePickerSub}>We'll assign a captain 15 minutes before pickup.</Text>

            <Text style={styles.pickerLabel}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
              {dateOptions.map((date, idx) => {
                const isSelected = reserveDate.toDateString() === date.toDateString();
                const dayName = idx === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" });
                return (
                  <TouchableOpacity key={idx} style={[styles.dateCard, isSelected && { borderColor: accent.accent, backgroundColor: accent.skin }]} onPress={() => setReserveDate(date)}>
                    <Text style={[styles.dateCardDay, isSelected && { color: accent.accent }]}>{dayName}</Text>
                    <Text style={[styles.dateCardNum, isSelected && { color: accent.accent }]}>{date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.pickerLabel}>Pickup time</Text>
            <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
              <ScrollView style={{ flex: 1 }} horizontal={false} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {["1","2","3","4","5","6","7","8","9","10","11","12"].map((hr) => (
                    <TouchableOpacity key={hr} style={[styles.timeChip, reserveHour === hr && { backgroundColor: accent.skin, borderColor: accent.accent }]} onPress={() => setReserveHour(hr)}>
                      <Text style={[styles.timeChipText, reserveHour === hr && { color: accent.accent }]}>{hr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["00","15","30","45"].map((min) => (
                <TouchableOpacity key={min} style={[styles.timeChip, reserveMinute === min && { backgroundColor: accent.skin, borderColor: accent.accent }]} onPress={() => setReserveMinute(min)}>
                  <Text style={[styles.timeChipText, reserveMinute === min && { color: accent.accent }]}>{min}</Text>
                </TouchableOpacity>
              ))}
              {["AM","PM"].map((period) => (
                <TouchableOpacity key={period} style={[styles.timeChip, reserveAmpm === period && { backgroundColor: accent.skin, borderColor: accent.accent }]} onPress={() => setReserveAmpm(period)}>
                  <Text style={[styles.timeChipText, reserveAmpm === period && { color: accent.accent }]}>{period}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.scheduleSummaryRow}>
              <View style={styles.tierIconCircle}><Text style={{ fontSize: 17 }}>{ENABLED_TIERS.find((t) => t.id === selectedTier)?.icon}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.tierName}>{ENABLED_TIERS.find((t) => t.id === selectedTier)?.name}</Text>
                <Text style={styles.tierMeta}>
                  {selectedFare ? `Estimated ₹${Math.round(selectedFare.fareBreakdown.total)} · fare confirmed at pickup` : "Estimating fare…"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmScheduleBtn, booking && { opacity: 0.7 }]}
              disabled={booking}
              onPress={() => {
                const finalD = new Date(reserveDate);
                let hr = parseInt(reserveHour, 10);
                if (reserveAmpm === "PM" && hr < 12) hr += 12;
                if (reserveAmpm === "AM" && hr === 12) hr = 0;
                finalD.setHours(hr, parseInt(reserveMinute, 10), 0, 0);
                placeOrder(true, finalD);
              }}
              activeOpacity={0.9}
            >
              {booking ? (
                <ActivityIndicator size="small" color={accent.on} />
              ) : (
                <Text style={styles.confirmScheduleBtnText}>
                  Reserve for {reserveDate.toLocaleDateString([], { weekday: "short" })}, {reserveHour}:{reserveMinute} {reserveAmpm}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function decodePolyline(encoded: string) {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20 && index < encoded.length);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["ride"], insets: { bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    mapContainer: { flex: 1 },
    mapOverlay: { position: "absolute", left: 16, right: 16, zIndex: 10, flexDirection: "row", justifyContent: "space-between" },
    circleBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    toolGroup: { gap: 8 },
    toolCircleBtn: {
      width: moderateScale(38), height: moderateScale(38), borderRadius: moderateScale(19),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    routeChip: {
      position: "absolute", left: 66, right: 16, top: 54,
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9,
    },
    routeChipMain: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
    routeChipSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

    mapPinContainer: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    dropSquareMarker: { width: 22, height: 22, borderRadius: 6, backgroundColor: tokens.text, borderWidth: 3, borderColor: tokens.surface },

    pickupPinWrap: { width: 40, height: 44, alignItems: "center", justifyContent: "flex-end" },
    pickupPinHead: {
      width: 26, height: 26, borderRadius: 13, backgroundColor: accent.accent,
      borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
    },
    pickupPinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
    pickupPinTail: {
      width: 0, height: 0, marginTop: -2,
      borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
      borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: accent.accent,
    },
    userPin: { width: 22, height: 22, borderRadius: 11, backgroundColor: accent.accent, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
    pinInnerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
    stopPin: { width: 18, height: 18, backgroundColor: tokens.text, transform: [{ rotate: "45deg" }], borderWidth: 2, borderColor: tokens.surface },
    stopPinText: { color: "#fff", fontSize: 10, fontFamily: fontFamilies.body.bold, transform: [{ rotate: "-45deg" }] },
    locationBubble: {
      flexDirection: "row", alignItems: "center", backgroundColor: tokens.surface, paddingVertical: 6, paddingLeft: 12, paddingRight: 8,
      borderRadius: 10, minWidth: 100, maxWidth: 160, marginBottom: 10, borderWidth: 1, borderColor: tokens.border,
    },
    locationBubbleText: { flex: 1, fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), color: tokens.text },
    editBubbleBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", marginLeft: 6 },

    // Was a fixed height: "63%" regardless of how much the trip-options
    // list actually needed — with just Bike/Auto/Schedule, that left a big
    // empty gap between the content and the Book button, and hid more of
    // the map than necessary. Sized to content instead.
    sheet: {
      backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12,
      borderTopWidth: 1, borderColor: tokens.border, maxHeight: "63%",
    },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: tokens.borderStrong, alignSelf: "center", marginBottom: 14 },
    sheetHeadRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
    sheetTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.2, color: tokens.text },
    addStopLink: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: accent.accent },

    tierRow: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.bg, borderRadius: 16, padding: 12, minHeight: 72 },
    tierRowSelected: { borderColor: accent.accent, backgroundColor: accent.skin },
    tierIconCircle: { width: 46, height: 46, borderRadius: 14, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    tierName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(16), color: tokens.text },
    tierMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    tierPrice: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(20), letterSpacing: -0.3, color: tokens.text },

    scheduleRow: {
      flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, backgroundColor: tokens.bg,
      borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 14, minHeight: 56,
    },
    scheduleIconCircle: { width: 34, height: 34, borderRadius: 11, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    scheduleTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    scheduleSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 1 },

    footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.border, backgroundColor: tokens.surface },
    bookBtn: {
      backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), marginBottom: 14,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    bookBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    bookBtnPrice: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on, opacity: 0.85 },

    sheetOverlay: { flex: 1, justifyContent: "flex-end" },
    sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    datePickerSheet: { backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, maxHeight: "88%" },
    datePickerTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.2, color: tokens.text, marginBottom: 6 },
    datePickerSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, marginBottom: 18 },
    pickerLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },
    dateCard: { width: 62, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 14, paddingVertical: 10, alignItems: "center" },
    dateCardDay: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: tokens.sec },
    dateCardNum: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(18), color: tokens.text, marginTop: 4 },
    timeChip: { borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    timeChipText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: tokens.text },
    scheduleSummaryRow: {
      flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border,
      borderRadius: 14, padding: 13, marginBottom: 16,
    },
    confirmScheduleBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center", marginBottom: 20 },
    confirmScheduleBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },

    successBlock: { alignItems: "center", paddingHorizontal: 24, paddingTop: 52 },
    successIcon: { width: 76, height: 76, borderRadius: 999, backgroundColor: tokens.success, alignItems: "center", justifyContent: "center", marginBottom: 22 },
    successTitle: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(30), lineHeight: moderateScale(33), letterSpacing: -0.5, color: tokens.text, textAlign: "center" },
    successSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, marginTop: 12, textAlign: "center" },

    section: { paddingHorizontal: 16, paddingTop: 28 },
    detailsCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, overflow: "hidden" },
    detailsRow: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: tokens.border, gap: 16 },
    detailsLabel: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.sec, flexShrink: 0 },
    detailsValue: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text, textAlign: "right", flexShrink: 1 },
    detailsPrice: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.3, color: tokens.text },
    estimateNote: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 10, marginHorizontal: 2 },

    footerPrimaryBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    footerPrimaryBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    footerSecondaryBtn: { marginTop: 8, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    footerSecondaryBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.sec },
  });
