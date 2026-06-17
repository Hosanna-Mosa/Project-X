import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Platform, ViewStyle, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, MapType, MapStyleElement, Marker, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { DeliveryStop } from '@/contexts/deliveryStore';
import Colors from '@/constants/colors';

interface Props {
  children?: React.ReactNode;
  style?: ViewStyle | any;
  mapType?: MapType;
  stops?: DeliveryStop[];
  polyline?: string;
  driverLocation?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  onLocationUpdate?: (coords: { lat: number, lng: number }) => void;
  markers?: any[];
  driverMarkers?: any[];
  initialRegion?: Region;
  onMarkerPress?: (marker: any) => void;
  radiusCenter?: { lat: number; lng: number } | null;
  radiusMeters?: number;
}

export interface MapBackgroundRef {
  recenter: () => void;
  panTo: (lat: number, lng: number, delta?: number) => void;
  fitToRoute: () => void;
  fitToMarkers: (markers: any[]) => void;
}


// Minimalist, premium map style
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

export const MapBackground = forwardRef<MapBackgroundRef, Props>(({ 
  children, 
  style, 
  mapType = 'standard', 
  stops = [],
  markers = [], 
  driverMarkers = [],
  initialRegion,
  polyline, 
  driverLocation,
  userLocation,
  onLocationUpdate,
  onMarkerPress,
  radiusCenter,
  radiusMeters
}, ref) => {
  const [region, setRegion] = useState<Region | undefined>(initialRegion);
  const internalMapRef = useRef<MapView>(null);
  const locationRef = useRef<{lat: number, lng: number} | null>(null);

  const getRegionForLocation = (lat: number, lng: number, latDelta = 0.015, lngDelta = 0.015): Region => ({
    latitude: lat - (latDelta / 3), // offset slightly so pins are visible above bottom sheet
    longitude: lng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  });

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (locationRef.current && internalMapRef.current) {
        internalMapRef.current.animateToRegion(getRegionForLocation(locationRef.current.lat, locationRef.current.lng), 1000);
      }
    },
    panTo: (lat: number, lng: number, delta = 0.005) => {
      if (internalMapRef.current && lat && lng) {
        internalMapRef.current.animateToRegion(getRegionForLocation(lat, lng, delta, delta), 1000);
      }
    },
    fitToRoute: () => {
      if (!internalMapRef.current) return;
      
      const coords: { latitude: number, longitude: number }[] = [];
      
      stops.forEach(s => {
        if (s.lat && s.lng) {
          coords.push({ latitude: s.lat, longitude: s.lng });
        }
      });
      
      if (locationRef.current) {
        coords.push({ latitude: locationRef.current.lat, longitude: locationRef.current.lng });
      }

      if (driverLocation) {
        coords.push({ latitude: driverLocation.lat, longitude: driverLocation.lng });
      }

      if (coords.length > 0) {
        internalMapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    },
    fitToMarkers: (markerList: any[]) => {
      if (!internalMapRef.current || markerList.length === 0) return;
      const coords = markerList.map(m => ({ latitude: m.lat, longitude: m.lng }));
      if (locationRef.current) {
        coords.push({ latitude: locationRef.current.lat, longitude: locationRef.current.lng });
      }
      internalMapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 150, right: 80, bottom: 400, left: 80 },
        animated: true,
      });
    }
  }));

  // Auto-center map on userLocation and driverLocation dynamically
  useEffect(() => {
    if (internalMapRef.current && userLocation && driverLocation) {
      internalMapRef.current.fitToCoordinates([
        { latitude: Number(userLocation.lat), longitude: Number(userLocation.lng) },
        { latitude: Number(driverLocation.lat), longitude: Number(driverLocation.lng) }
      ], {
        edgePadding: { top: 120, right: 80, bottom: 430, left: 80 }, // keep bottom high to clear the success BottomSheet
        animated: true,
      });
    } else if (internalMapRef.current && userLocation) {
      const regionForUser = getRegionForLocation(userLocation.lat, userLocation.lng, 0.015, 0.015);
      internalMapRef.current.animateToRegion(regionForUser, 1000);
    }
  }, [userLocation, driverLocation]);

  useEffect(() => {
    if (initialRegion) {
      setRegion(initialRegion);
      return;
    }

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setRegion({
            latitude: 28.6139,
            longitude: 77.2090,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          return;
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        locationRef.current = { lat: location.coords.latitude, lng: location.coords.longitude };
        setRegion(getRegionForLocation(location.coords.latitude, location.coords.longitude));
        if (onLocationUpdate) {
          onLocationUpdate({ lat: location.coords.latitude, lng: location.coords.longitude });
        }
      } catch (error) {
        // Graceful fallback if device GPS is fully disabled
        console.warn("Location services unavailable:", error);
        setRegion({
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    })();
  }, [initialRegion]);

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      {region && (
        <MapView
          ref={internalMapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          mapType={mapType}
          customMapStyle={Platform.OS === 'web' || mapType === 'satellite' ? undefined : mapStyle}
          showsUserLocation={true}
          showsPointsOfInterest={false}
          showsCompass={false}
          showsMyLocationButton={false}
          pointerEvents="auto"
          onMapReady={() => {
            if (userLocation && internalMapRef.current) {
              const regionForUser = getRegionForLocation(userLocation.lat, userLocation.lng, 0.015, 0.015);
              internalMapRef.current.animateToRegion(regionForUser, 500);
            }
          }}
        >
          {radiusCenter && radiusMeters && (
            <Circle
              center={{ latitude: radiusCenter.lat, longitude: radiusCenter.lng }}
              radius={radiusMeters}
              fillColor="rgba(16, 185, 129, 0.1)"
              strokeColor="rgba(16, 185, 129, 0.5)"
              strokeWidth={2}
            />
          )}

          {markers.map((item) => (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.lat, longitude: item.lng }}
              onPress={() => onMarkerPress?.(item)}
              pinColor="#EF4444" // Standard red color for reliability
              tracksViewChanges={true}
            />
          ))}

          {driverMarkers.map((driver) => {
            const vehicleType = driver.vehicleType || driver.vehicle || "car";
            const iconName = vehicleType === "bike" ? "navigation" : vehicleType === "auto" ? "truck" : "briefcase";
            return (
              <Marker
                key={driver.id || driver._id}
                coordinate={{ latitude: driver.lat, longitude: driver.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View style={styles.vehicleMarker}>
                  <Feather name={iconName as any} size={12} color="#111827" />
                </View>
              </Marker>
            );
          })}

          {stops.map((stop, index) => (
            stop.lat && stop.lng && (
              <Marker
                key={stop.id}
                coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                title={stop.storeName || `Pickup ${index + 1}`}
                description={stop.address}
              />
            )
          ))}
          
          {userLocation && (
            <Marker
              key="user-location-pin"
              coordinate={{ latitude: Number(userLocation.lat), longitude: Number(userLocation.lng) }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.userMarkerWrap}>
                <View style={styles.userMarkerBadge} />
              </View>
            </Marker>
          )}

          {driverLocation && (
            Platform.OS === 'web' ? (
              <Marker
                coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                title="Sarah Jenkins (Helper)"
                pinColor="#000000"
              />
            ) : (
              <Marker
                coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                flat={true}
                tracksViewChanges={true}
              >
                <View style={styles.driverMarker}>
                  <View style={styles.driverBadge}>
                    <Feather name="user" size={14} color="#fff" />
                  </View>
                  <View style={styles.driverPulse} />
                </View>
              </Marker>
            )
          )}

          {polyline && (
            <Polyline
              coordinates={decodePolyline(polyline)}
              strokeWidth={4}
              strokeColor="#000000"
            />
          )}
        </MapView>
      )}
      {children}
    </View>

  );
});

// Utility to decode Google Polyline
function decodePolyline(encoded: string) {
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    const p = {
      latitude: (lat / 1e5),
      longitude: (lng / 1e5),
    };
    poly.push(p);
  }
  return poly;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  markerBadge: {
    backgroundColor: Colors.light.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
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
    backgroundColor: Colors.light.primary,
  },
  driverMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  driverBadge: {
    backgroundColor: Colors.light.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
    elevation: 8,
  },
  driverPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.light.primary}30`,
    zIndex: 1,
  },
  redMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  redMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  redMarkerPin: {
    width: 2,
    height: 8,
    backgroundColor: '#EF4444',
    marginTop: -2,
  },
  userMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  userMarkerBadge: {
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  vehicleMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111827',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  }
});
