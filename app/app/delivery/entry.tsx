import React, { useState, useRef } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import * as Location from "expo-location";
import { BottomSheet } from "@/components/BottomSheet";
import { StopCard } from "@/components/StopCard";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { MapType } from "react-native-maps";

export default function DeliveryEntryScreen() {
  const insets = useSafeAreaInsets();
  const { 
    stops, 
    route,
    currentLocation, 
    currentCoords,
    setCurrentLocation, 
    setCurrentCoords, 
    addStop, 
    removeStop, 
    setStops,
    setRoute,
    scheduling, 
    loadType, 
    setScheduling, 
    setLoadType,
    calculatePrice
  } = useDeliveryStore();
  const [showMapControls, setShowMapControls] = useState(false);
  const [mapType, setMapType] = useState<MapType>("standard");
  const [isCalculating, setIsCalculating] = useState(false);
  const mapRef = useRef<MapBackgroundRef>(null);

  const handleRecenter = () => {
    mapRef.current?.recenter();
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === "standard" ? "satellite" : "standard"));
  };

  const handleAddStop = () => {
    router.push("/delivery/add-stop");
  };

  const handleLocationUpdate = async (coords: { lat: number; lng: number }) => {
    setCurrentCoords(coords);
    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });

      if (place) {
        const address = `${place.name || place.streetNumber || ""} ${place.street || ""}, ${place.city || ""}, ${place.region || ""} ${place.postalCode || ""}`.trim();
        setCurrentLocation(address || "Current Location Found");
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const handleStopPress = (stop: any) => {
    if (stop.lat && stop.lng) {
      mapRef.current?.panTo(stop.lat, stop.lng);
    }
  };

  const handleCalculateRoute = async () => {
    if (stops.length === 0 || !currentCoords) return;

    setIsCalculating(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routing/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: currentCoords,
          stops: stops,
        }),
      });

      const data = await response.json();
      if (data.optimizedStops && data.polyline) {
        setStops(data.optimizedStops);
        setRoute({
          totalDistance: data.totalDistance,
          estimatedTime: data.estimatedTime,
          polyline: data.polyline,
        });
        calculatePrice();
        
        // After getting the route, show checkout
        router.push("/delivery/checkout");
      }
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const schedulingLabel = scheduling === "asap" ? "ASAP Delivery" : "Scheduled";
  const loadTypeLabel = loadType === "mixed" ? "Parcel/Mixed" : loadType.charAt(0).toUpperCase() + loadType.slice(1);

  return (
    <View style={styles.root}>
      <MapBackground 
        ref={mapRef}
        mapType={mapType}
        stops={stops}
        polyline={route?.polyline}
        onLocationUpdate={handleLocationUpdate}
        style={StyleSheet.absoluteFill} 
      />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
          },
        ]}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.topTitleCol}>
          <Text style={styles.topTitle}>Create Multi-Stop Delivery</Text>
        </View>
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>BETA</Text>
        </View>
        <TouchableOpacity style={styles.avatarSm}>
          <Feather name="user" size={18} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapControlBtn} onPress={handleRecenter}>
          <Feather name="crosshair" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlBtn} onPress={toggleMapType}>
          <Feather name={mapType === "standard" ? "layers" : "map"} size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <BottomSheet style={styles.bottomSheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>Route Optimization</Text>
          <Text style={styles.sheetSubtitle}>
            Add up to 10 stops for automated sequence planning.
          </Text>

          <View style={styles.currentLocationCard}>
            <Feather name="map-pin" size={16} color={Colors.light.primary} />
            <View style={styles.currentLocationText}>
              <Text style={styles.currentLocationLabel}>CURRENT LOCATION</Text>
              <Text style={styles.currentLocationValue}>{currentLocation}</Text>
            </View>
          </View>

          {stops.length > 0 && (
            <View style={styles.stopsList}>
              {stops.map((stop, i) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={i}
                  onRemove={removeStop}
                  onPress={handleStopPress}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.addStopBtn}
            onPress={handleAddStop}
            activeOpacity={0.85}
          >
            <View style={styles.addStopIcon}>
              <Feather name="plus" size={20} color="#fff" />
            </View>
            <View style={styles.addStopText}>
              <Text style={styles.addStopTitle}>Add Pickup Location</Text>
              <Text style={styles.addStopSubtitle}>Scan QR or enter address manually</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
          </TouchableOpacity>

          {/* <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setScheduling(scheduling === "asap" ? "scheduled" : "asap")}
              activeOpacity={0.8}
            >
              <Feather name="clock" size={18} color={Colors.light.primary} />
              <View>
                <Text style={styles.optionLabel}>SCHEDULING</Text>
                <Text style={styles.optionValue}>{schedulingLabel}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setLoadType(loadType === "mixed" ? "parcel" : "mixed")}
              activeOpacity={0.8}
            >
              <Feather name="archive" size={18} color={Colors.light.primary} />
              <View>
                <Text style={styles.optionLabel}>LOAD TYPE</Text>
                <Text style={styles.optionValue}>{loadTypeLabel}</Text>
              </View>
            </TouchableOpacity>
          </View> */}

          <TouchableOpacity
            style={[
              styles.calculateBtn,
              (stops.length === 0 || isCalculating) && styles.calculateBtnDisabled,
            ]}
            onPress={handleCalculateRoute}
            disabled={stops.length === 0 || isCalculating}
            activeOpacity={0.85}
          >
            <Text style={styles.calculateBtnText}>
              {isCalculating ? "Optimizing..." : "Calculate Optimized Route"}
            </Text>
            {isCalculating ? (
              <Feather name="loader" size={18} color="#fff" />
            ) : (
              <Feather name="zap" size={18} color="#fff" />
            )}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  topTitleCol: {
    flex: 1,
  },
  topTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  betaBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  betaText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  mapControls: {
    position: "absolute",
    right: 16,
    top: "35%",
    zIndex: 10,
    gap: 8,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "65%",
    paddingBottom: 0,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  currentLocationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  currentLocationText: {
    flex: 1,
    gap: 3,
  },
  currentLocationLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.light.textMuted,
    letterSpacing: 0.5,
  },
  currentLocationValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  stopsList: {
    marginBottom: 8,
  },
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.light.primary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: `${Colors.light.primary}06`,
  },
  addStopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addStopText: {
    flex: 1,
    gap: 2,
  },
  addStopTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  addStopSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.light.textMuted,
    letterSpacing: 0.5,
  },
  optionValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  calculateBtn: {
    backgroundColor: Colors.light.textSecondary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  calculateBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  calculateBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
