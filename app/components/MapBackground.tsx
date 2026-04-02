import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Platform, ViewStyle, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, MapType, MapStyleElement, Marker, Polyline } from 'react-native-maps';
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
  onLocationUpdate?: (coords: { lat: number, lng: number }) => void;
}

export interface MapBackgroundRef {
  recenter: () => void;
  panTo: (lat: number, lng: number) => void;
  fitToRoute: () => void;
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
  polyline, 
  driverLocation,
  onLocationUpdate 
}, ref) => {
  const [initialRegion, setInitialRegion] = useState<Region | undefined>(undefined);
  const internalMapRef = useRef<MapView>(null);
  const locationRef = useRef<{lat: number, lng: number} | null>(null);

  const getRegionForLocation = (lat: number, lng: number): Region => ({
    latitude: lat - 0.005,
    longitude: lng,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (locationRef.current && internalMapRef.current) {
        internalMapRef.current.animateToRegion(getRegionForLocation(locationRef.current.lat, locationRef.current.lng), 1000);
      }
    },
    panTo: (lat: number, lng: number) => {
      if (internalMapRef.current && lat && lng) {
        internalMapRef.current.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
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
    }
  }));

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setInitialRegion({
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      locationRef.current = { lat: location.coords.latitude, lng: location.coords.longitude };
      setInitialRegion(getRegionForLocation(location.coords.latitude, location.coords.longitude));
      if (onLocationUpdate) {
        onLocationUpdate({ lat: location.coords.latitude, lng: location.coords.longitude });
      }
    })();
  }, []);

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      {initialRegion && (
        <MapView
          ref={internalMapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          mapType={mapType}
          customMapStyle={Platform.OS === 'web' || mapType === 'satellite' ? undefined : mapStyle}
          showsUserLocation={true}
          showsPointsOfInterest={false}
          showsCompass={false}
          showsMyLocationButton={false}
          pointerEvents="auto"
        >
          {stops.map((stop, index) => (
            stop.lat && stop.lng && (
              <Marker
                key={stop.id}
                coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                title={stop.storeName || `Pickup ${index + 1}`}
                description={stop.address}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerBadge}>
                    <Text style={styles.markerBadgeText}>{index + 1}</Text>
                  </View>
                  <View style={styles.markerPin} />
                </View>
              </Marker>
            )
          ))}
          
          {driverLocation && (
            <Marker
              coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
            >
              <View style={styles.driverMarker}>
                <View style={styles.driverBadge}>
                  <Feather name="truck" size={12} color="#fff" />
                </View>
                <View style={styles.driverPulse} />
              </View>
            </Marker>
          )}

          {polyline && (
            <Polyline
              coordinates={decodePolyline(polyline)}
              strokeWidth={4}
              strokeColor={Colors.light.primary}
              lineDashPattern={Platform.OS === 'ios' ? [0] : undefined}
            />
          )}
        </MapView>
      )}
      <View style={styles.mapOverlay} pointerEvents="none" />
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
  }
});
