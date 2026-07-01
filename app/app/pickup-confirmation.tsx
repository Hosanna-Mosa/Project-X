import React from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";

const { height } = Dimensions.get("window");

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

const firstLine = (value?: string) => {
  if (!value) return "Pickup point";
  return value.split(",")[0]?.trim() || value;
};

const formatGeocodeAddress = (place: Location.LocationGeocodedAddress) => {
  const parts = [
    place.name,
    place.street,
    place.district,
    place.city,
    place.region,
    place.postalCode,
  ].filter(Boolean);

  return parts.join(", ") || "Current location";
};

export default function PickupConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors, insets), [colors, insets]);
  const mapRef = React.useRef<MapView>(null);

  const params = useLocalSearchParams<{
    serviceId: string;
    rideId: string;
    rideName: string;
    ridePrice: string;
    pickupName: string;
    dropName: string;
    pickupLat: string;
    pickupLng: string;
    dropLat: string;
    dropLng: string;
    stops?: string;
    estimatedMinutes?: string;
    distanceInKm?: string;
    fareTotal?: string;
  }>();

  const pickupCoords = React.useMemo(
    () => ({
      latitude: parseFloat(params.pickupLat || "0"),
      longitude: parseFloat(params.pickupLng || "0"),
    }),
    [params.pickupLat, params.pickupLng],
  );
  const [confirmedPickup, setConfirmedPickup] = React.useState({
    name: params.pickupName || "Pickup point",
    coords: pickupCoords,
  });

  const [estimate, setEstimate] = React.useState<FareEstimate | null>(() => {
    const total = Number(params.fareTotal);
    const estimatedMinutes = Number(params.estimatedMinutes);
    const distanceInKm = Number(params.distanceInKm);
    if (!Number.isFinite(total) || !total) return null;
    return {
      distanceInKm: Number.isFinite(distanceInKm) ? distanceInKm : 0,
      estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 0,
      fareBreakdown: { total },
    };
  });
  const [loadingEstimate, setLoadingEstimate] = React.useState(false);

  React.useEffect(() => {
    const canEstimate =
      Number.isFinite(confirmedPickup.coords.latitude) &&
      Number.isFinite(confirmedPickup.coords.longitude) &&
      Number.isFinite(Number(params.dropLat)) &&
      Number.isFinite(Number(params.dropLng));

    if (!canEstimate) return;

    const loadEstimate = async () => {
      setLoadingEstimate(true);
      try {
        const query = new URLSearchParams({
          pickupLat: String(confirmedPickup.coords.latitude),
          pickupLng: String(confirmedPickup.coords.longitude),
          dropLat: String(params.dropLat),
          dropLng: String(params.dropLng),
          serviceType: normalizeServiceType(params.serviceId),
        });
        const result = await customFetch<FareEstimate>(
          `/api/v1/orders/estimate-fare?${query.toString()}`,
          { responseType: "json" },
        );
        setEstimate(result);
      } catch (error) {
        console.error("Pickup estimate error:", error);
      } finally {
        setLoadingEstimate(false);
      }
    };

    loadEstimate();
  }, [
    params.dropLat,
    params.dropLng,
    params.serviceId,
    confirmedPickup.coords.latitude,
    confirmedPickup.coords.longitude,
  ]);

  const recenter = () => {
    mapRef.current?.animateToRegion(
      {
        ...confirmedPickup.coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  };

  const updatePickup = () => {
    router.push({
      pathname: "/ride-searching",
      params: {
        serviceId: params.serviceId,
        rideId: params.rideId,
        rideName: params.rideName,
        ridePrice: estimate ? `₹${estimate.fareBreakdown.total.toFixed(2)}` : params.ridePrice,
        pickupName: confirmedPickup.name,
        pickupLat: confirmedPickup.coords.latitude.toString(),
        pickupLng: confirmedPickup.coords.longitude.toString(),
        dropName: params.dropName,
        dropLat: params.dropLat,
        dropLng: params.dropLng,
        fareTotal: estimate?.fareBreakdown.total.toString() || params.fareTotal,
        estimatedMinutes: estimate?.estimatedMinutes.toString() || params.estimatedMinutes,
        distanceInKm: estimate?.distanceInKm.toString() || params.distanceInKm,
        stops: params.stops,
      },
    });
  };

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      let locationName = "Current location";
      try {
        const places = await Location.reverseGeocodeAsync(coords);
        if (places[0]) {
          locationName = formatGeocodeAddress(places[0]);
        }
      } catch (error) {
        console.error("Current location reverse geocode error:", error);
      }

      setConfirmedPickup({
        name: locationName,
        coords,
      });

      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    } catch {
      Alert.alert("Error", "Could not fetch current location.");
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            ...pickupCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation
        />

        <View pointerEvents="none" style={styles.centerMarker}>
          <View style={styles.markerWrap}>
            <View style={styles.pickupBubble}>
              <Text style={styles.pickupBubbleText}>Pickup Point</Text>
            </View>
            <View style={styles.pin}>
              <Ionicons name="navigate" size={18} color={colors.surface} />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 16 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.locateButton} onPress={useCurrentLocation}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <View style={styles.handle} />
        <Text style={styles.title}>Double check pickup point</Text>

        <TouchableOpacity style={styles.addressCard} onPress={recenter} activeOpacity={0.85}>
          <Text style={styles.addressTitle} numberOfLines={1}>
            {firstLine(confirmedPickup.name)}
          </Text>
          <Text style={styles.addressSubtitle} numberOfLines={1}>
            {confirmedPickup.name}
          </Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{params.rideName || "Ride"}</Text>
          <View style={styles.metaValue}>
            {loadingEstimate ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={styles.metaText}>
                {estimate ? `₹${estimate.fareBreakdown.total.toFixed(2)}` : params.ridePrice}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.updateButton} onPress={updatePickup}>
          <Text style={styles.updateButtonText}>Update pickup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light, insets: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mapArea: {
      height: height * 0.64,
      backgroundColor: "#eef1f4",
    },
    backButton: {
      position: "absolute",
      left: 16,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    locateButton: {
      position: "absolute",
      right: 16,
      bottom: 18,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    centerMarker: {
      position: "absolute",
      left: "50%",
      top: "50%",
      marginLeft: -75,
      marginTop: -58,
      width: 150,
      height: 92,
      alignItems: "center",
      justifyContent: "flex-start",
      zIndex: 8,
      elevation: 8,
    },
    markerWrap: {
      alignItems: "center",
      width: 150,
      height: 92,
    },
    pickupBubble: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 18,
      marginBottom: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      minWidth: 116,
      alignItems: "center",
    },
    pickupBubbleText: {
      color: colors.surface,
      fontSize: 13,
      fontWeight: "800",
    },
    pin: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    panel: {
      flex: 1,
      marginTop: -18,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 22 : 34,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 16,
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 18,
    },
    addressCard: {
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 10,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 12,
    },
    addressTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 1,
    },
    addressSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    metaRow: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 26,
    },
    metaText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    metaValue: {
      minWidth: 62,
      alignItems: "flex-end",
    },
    updateButton: {
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    updateButtonText: {
      color: colors.surface,
      fontSize: 15,
      fontWeight: "800",
    },
  });
