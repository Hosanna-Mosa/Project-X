import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { LIGHT_GREEN_MAP_STYLE } from "@/constants/mapStyle";
import { customFetch } from "@/utils/api/custom-fetch";

export default function MapPickerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    serviceId: string;
    type?: 'pickup' | 'drop';
    pickupName?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropName?: string;
    dropLat?: string;
    dropLng?: string;
  }>();
  const { serviceId, type } = params;
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.ride;
  const styles = useMemo(() => createStyles(tokens, accent, insets), [theme, insets]);

  const [step, setStep] = useState<'pickup' | 'drop'>(type || 'pickup');
  const [region, setRegion] = useState({
    latitude: 17.0052,
    longitude: 81.7778,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [address, setAddress] = useState("Fetching address...");
  const [loading, setLoading] = useState(false);
  const [recentering, setRecentering] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setRegion((r) => ({ ...r, latitude: location.coords.latitude, longitude: location.coords.longitude }));
      }
    })();
  }, []);

  const handleRegionChangeComplete = async (newRegion: any) => {
    setRegion(newRegion);
    setLoading(true);
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });
      if (geocode.length > 0) {
        const addr = geocode[0];
        const displayAddr = `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        setAddress(displayAddr || "Unknown location");
      }
    } catch (error) {
      setAddress("Error fetching address");
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setRecentering(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const nextRegion = { ...region, latitude: location.coords.latitude, longitude: location.coords.longitude };
      mapRef.current?.animateToRegion(nextRegion, 350);
      handleRegionChangeComplete(nextRegion);
    } catch {
      Alert.alert("Error", "Could not get current location");
    } finally {
      setRecentering(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const checkRes = await customFetch<any>(`/api/v1/zones/check?lat=${region.latitude}&lng=${region.longitude}`);
      if (!checkRes || !checkRes.inZone) {
        Alert.alert("No Service", `No service at current ${step} location.`);
        return;
      }
    } catch (err) {
      console.error("Zone check failed:", err);
    } finally {
      setLoading(false);
    }

    const currentData = { name: address, lat: region.latitude, lng: region.longitude };

    if (step === 'pickup') {
      router.push({
        pathname: "/drop-location",
        params: {
          serviceId,
          pickupName: currentData.name,
          pickupLat: currentData.lat.toString(),
          pickupLng: currentData.lng.toString(),
          dropName: params.dropName,
          dropLat: params.dropLat,
          dropLng: params.dropLng,
        }
      });
    } else {
      router.push({
        pathname: "/drop-location",
        params: {
          serviceId,
          pickupName: params.pickupName,
          pickupLat: params.pickupLat,
          pickupLng: params.pickupLng,
          dropName: currentData.name,
          dropLat: currentData.lat.toString(),
          dropLng: currentData.lng.toString(),
        }
      });
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={LIGHT_GREEN_MAP_STYLE}
        />

        <View style={styles.centerMarkerContainer} pointerEvents="none">
          <View style={styles.dragHint}>
            <Text style={styles.dragHintText}>Drag to adjust</Text>
          </View>
          <View style={styles.dragHintStem} />
          <View style={styles.pinWrapper}>
            <View style={styles.pinHead}>
              <View style={styles.pinDot} />
            </View>
            <View style={styles.pinStem} />
            <View style={styles.pinShadow} />
          </View>
        </View>

        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.recenterBtn} onPress={handleUseCurrentLocation} disabled={recentering}>
          {recentering ? (
            <ActivityIndicator size="small" color={tokens.text} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={moderateScale(19)} color={tokens.text} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.sheetHandle} />
        <Text style={styles.panelTitle}>Double check {step} point</Text>
        <Text style={styles.panelSub}>
          Move the pin to where you'll actually stand. Captains cancel most often when the pin is inside a gated community.
        </Text>

        <View style={styles.addressCard}>
          <View style={styles.addressDot} />
          <View style={styles.addressInfo}>
            <Text style={styles.addressMain} numberOfLines={1}>
              {loading ? "Locating…" : address.split(",")[0]}
            </Text>
            <Text style={styles.addressSub} numberOfLines={1}>
              {loading ? "Fetching address details…" : address}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={accent.accent} />
          ) : (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading} activeOpacity={0.9}>
          <Text style={styles.confirmBtnText}>Confirm {step}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["ride"], insets: { bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    mapContainer: { flex: 1 },
    backBtn: {
      position: "absolute", left: 16, width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center", zIndex: 10,
    },
    recenterBtn: {
      position: "absolute", right: 16, bottom: "44%", width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(22),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center", zIndex: 10,
    },
    centerMarkerContainer: { position: "absolute", top: "50%", left: "50%", marginLeft: -moderateScale(17), marginTop: -moderateScale(80), alignItems: "center" },
    dragHint: { backgroundColor: tokens.text, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7 },
    dragHintText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: tokens.bg },
    dragHintStem: { width: 2, height: 12, backgroundColor: tokens.text },
    pinWrapper: { alignItems: "center" },
    pinHead: {
      width: moderateScale(34), height: moderateScale(34), borderRadius: moderateScale(17), backgroundColor: accent.accent,
      borderWidth: 3, borderColor: tokens.surface, alignItems: "center", justifyContent: "center",
    },
    pinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: accent.on },
    pinStem: { width: 2, height: 18, backgroundColor: accent.accent },
    pinShadow: { width: 12, height: 5, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.28)" },

    bottomPanel: {
      backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 18,
      borderTopWidth: 1, borderColor: tokens.border,
    },
    sheetHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: tokens.borderStrong, marginBottom: 18 },
    panelTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.2, color: tokens.text, marginBottom: 6 },
    panelSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, marginBottom: 16 },

    addressCard: {
      backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border, borderRadius: 14,
      padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14,
    },
    addressDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: accent.accent, flexShrink: 0 },
    addressInfo: { flex: 1, minWidth: 0 },
    addressMain: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    addressSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    editLink: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), letterSpacing: 0.5, textTransform: "uppercase", color: accent.accent },

    confirmBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    confirmBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  });
