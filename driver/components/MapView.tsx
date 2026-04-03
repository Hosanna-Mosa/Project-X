import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, MapStyleElement } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Stop, useDriverStore } from "@/store/driverStore";

interface MapViewProps {
  stops?: Stop[];
  currentStep?: number;
  style?: object;
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Premium Map Styling (aligned with customer app)
const mapStyle: MapStyleElement[] = [
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#7c93a3" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.stroke",
    "stylers": [
      { "visibility": "on" },
      { "color": "#ffffff" },
      { "weight": 2 },
      { "gamma": 0.84 }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [{ "color": "#f1f5f9" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#cbd5e1" }]
  }
];

// Unified Driver Marker (same as customer app for visual identity)
const DriverMarker = () => (
    <View style={styles.driverMarker}>
      <View style={styles.driverBadge}>
        <Feather name="navigation" size={14} color="#fff" />
      </View>
      <View style={styles.driverPulse} />
    </View>
);

// Stop Marker
const StopMarker = ({ index, type, isNext }: { index: number; type: string; isNext: boolean }) => (
  <View style={styles.markerContainer}>
    <View style={[
        styles.markerBadge,
        { backgroundColor: type === "pickup" ? Colors.primary : Colors.success },
        !isNext && { opacity: 0.8, transform: [{ scale: 0.9 }] }
    ]}>
      <Text style={styles.markerBadgeText}>{index + 1}</Text>
    </View>
    <View style={[
        styles.markerPin,
        { backgroundColor: type === "pickup" ? Colors.primary : Colors.success }
    ]} />
  </View>
);

export default function MapViewComponent({ stops = [], currentStep = 0, style }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const { driverLocation } = useDriverStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady && mapRef.current && stops.length > 0) {
      const points = [
        { latitude: driverLocation.lat, longitude: driverLocation.lng },
        ...stops.map(s => ({ latitude: s.lat, longitude: s.lng }))
      ];
      
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 100, right: 80, bottom: 300, left: 80 },
        animated: true,
      });
    }
  }, [isReady, stops, driverLocation]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.webMapContainer, style]}>
        <View style={styles.webMapContent}>
          <Text style={styles.webMapIcon}>🗺</Text>
          <Text style={styles.webMapText}>Map View</Text>
          <Text style={styles.webMapSubtext}>Live navigation available on device</Text>
        </View>
      </View>
    );
  }

  const upcomingStop = stops[Math.min(currentStep, stops.length - 1)];

  return (
    <View style={[styles.nativeMapContainer, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: driverLocation.lat,
          longitude: driverLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
        showsTraffic={false}
        showsPointsOfInterest={false}
        onMapReady={() => setIsReady(true)}
      >
        {/* Driver Marker */}
        <Marker
          coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
        >
          <DriverMarker />
        </Marker>

        {/* Stop Markers */}
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={stop.locationName}
          >
            <StopMarker 
              index={index} 
              type={stop.type} 
              isNext={index === Math.floor(currentStep / 3)} 
            />
          </Marker>
        ))}

        {/* Directions */}
        {GOOGLE_MAPS_API_KEY && upcomingStop && (
          <MapViewDirections
            origin={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            destination={{ latitude: upcomingStop.lat, longitude: upcomingStop.lng }}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor={Colors.primary}
            lineDashPattern={[0]}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeMapContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  webMapContainer: {
    backgroundColor: "#E8F4FD",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    flex: 1,
  },
  webMapContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  webMapIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  webMapText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  webMapSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // Unified Marker Styles
  driverMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  driverBadge: {
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  driverPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}30`,
    zIndex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  markerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  markerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerPin: {
    width: 1,
    height: 4,
  },
});
