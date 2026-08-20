import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import * as Location from "expo-location";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { StopCard } from "@/components/StopCard";
import { useDeliveryStore } from "@/contexts/deliveryStore";

export default function DeliveryEntryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.delivery;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const {
    stops, route, price, currentLocation, currentCoords,
    setCurrentLocation, setCurrentCoords, removeStop, setStops, setRoute, calculatePrice,
  } = useDeliveryStore();

  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<MapBackgroundRef>(null);

  const handleLocationUpdate = async (coords: { lat: number; lng: number }) => {
    setCurrentCoords(coords);
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
      if (place) {
        const address = `${place.name || place.streetNumber || ""} ${place.street || ""}, ${place.city || ""}`.trim();
        setCurrentLocation(address || "Current location");
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const handleRecenter = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await handleLocationUpdate({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        mapRef.current?.recenter();
      }
    } catch (error) {
      console.error("Recenter failed:", error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleStopPress = (stop: any) => {
    if (stop.lat && stop.lng) mapRef.current?.panTo(stop.lat, stop.lng);
  };

  // Live route + fee estimate, recomputed as stops change, so the price is
  // never a reveal at checkout — matches the real /routing/optimize call
  // that used to only fire once, on the final button press.
  useEffect(() => {
    if (stops.length === 0 || !currentCoords) {
      setRoute(null as any);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/routing/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: currentCoords, stops }),
        });
        const data = await response.json();
        if (!cancelled && data.optimizedStops && data.polyline) {
          setStops(data.optimizedStops);
          setRoute({ totalDistance: data.totalDistance, estimatedTime: data.estimatedTime, polyline: data.polyline });
          calculatePrice();
        }
      } catch (error) {
        console.error("Optimization failed:", error);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length, currentCoords?.lat, currentCoords?.lng]);

  const handleReview = () => {
    if (stops.length === 0) return;
    router.push("/delivery/checkout");
  };

  return (
    <View style={styles.root}>
      <MapBackground ref={mapRef} stops={stops} polyline={route?.polyline} onLocationUpdate={handleLocationUpdate} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Package delivery</Text>
        <View style={styles.betaBadge}><Text style={styles.betaBadgeText}>Beta</Text></View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <Text style={styles.headline}>Create multi-stop{"\n"}delivery</Text>
          <Text style={styles.subhead}>Pick up from several places on one run. We'll pay at the store and you settle here.</Text>

          <TouchableOpacity style={styles.startCard} activeOpacity={0.85} onPress={handleRecenter}>
            <View style={styles.startIcon}>
              {isLocating ? <ActivityIndicator size="small" color={accent.accent} /> : <Ionicons name="locate" size={moderateScale(17)} color={accent.accent} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.startLabel}>Starting from</Text>
              <Text style={styles.startValue} numberOfLines={1}>{currentLocation}</Text>
            </View>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>

          <View style={styles.routeSection}>
            <Text style={styles.sectionLabel}>Route · {stops.length} {stops.length === 1 ? "stop" : "stops"}</Text>
            {stops.length > 0 && (
              <View style={{ gap: 8, marginBottom: 10 }}>
                {stops.map((stop, i) => (
                  <StopCard key={stop.id} stop={stop} index={i} onRemove={removeStop} onPress={handleStopPress} />
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.addStopBtn} onPress={() => router.push("/delivery/add-stop")} activeOpacity={0.85}>
              <Text style={styles.addStopBtnText}>+ Add pickup location</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          {stops.length > 0 && (
            <View style={styles.footerRow}>
              {isCalculating ? (
                <Text style={styles.footerMeta}>Calculating route…</Text>
              ) : route ? (
                <Text style={styles.footerMeta}>{route.totalDistance} km · about {route.estimatedTime} min</Text>
              ) : (
                <Text style={styles.footerMeta}>Add a pickup to see distance</Text>
              )}
              {price != null && <Text style={styles.footerPrice}>₹{price.total} delivery</Text>}
            </View>
          )}
          <TouchableOpacity
            style={[styles.reviewBtn, (stops.length === 0 || isCalculating) && { opacity: 0.5 }]}
            disabled={stops.length === 0 || isCalculating}
            onPress={handleReview}
          >
            <Text style={styles.reviewBtnText}>Review route</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["delivery"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { position: "absolute", left: 16, right: 16, zIndex: 10, flexDirection: "row", alignItems: "center", gap: 10 },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, overflow: "hidden" },
    betaBadge: { backgroundColor: tokens.sunken, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
    betaBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: tokens.sec },

    sheet: {
      position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "72%",
      backgroundColor: tokens.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: 1, borderColor: tokens.border,
    },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: tokens.borderStrong, alignSelf: "center", marginBottom: 16 },

    headline: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(24), lineHeight: moderateScale(27), letterSpacing: -0.4, color: tokens.text },
    subhead: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, marginTop: 8 },

    startCard: {
      flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border,
      borderRadius: 16, padding: 14, minHeight: 64, marginTop: 16,
    },
    startIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    startLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    startValue: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text, marginTop: 3 },
    changeLink: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), letterSpacing: 0.5, textTransform: "uppercase", color: accent.accent },

    routeSection: { marginTop: 20 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },
    addStopBtn: { borderWidth: 1, borderStyle: "dashed", borderColor: accent.accent, backgroundColor: tokens.bg, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    addStopBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: accent.accent },

    footer: { paddingTop: 4, paddingBottom: 14 },
    footerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    footerMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec },
    footerPrice: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    reviewBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    reviewBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  });
